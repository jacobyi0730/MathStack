import './styles.css';
import { createGameState, type GameState, type SpecialRewardQuiz } from './engine/state.js';
import { createLoop } from './engine/loop.js';
import { setupStressMode, stressModeEnabled } from './engine/stress.js';
import { createTimer } from './engine/timing.js';
import { createRenderer, type RenderScene } from './engine/renderer.js';
import { createDebugOverlay } from './ui/debug-overlay.js';
import { createHud, type Hud, type HudSlotState, type HudState } from './ui/hud.js';
import { createQuizModal, type QuizModal, type QuizModalState } from './ui/quiz-modal.js';
import { createResultScreen, type ResultScreenSummary } from './ui/result.js';
import { createSkillChoiceView } from './ui/skill-choice.js';
import { createTitleFlow, type TitleSelection } from './ui/title.js';
import { createInputController } from './engine/input.js';
import { updateDamageNumbers } from './entities/damage-number.js';
import { createPlayer, syncPlayerIntent } from './entities/player.js';
import { BOSSES } from './data/bosses.js';
import { CHARACTER_PROFILES } from './data/player.js';
import { PASSIVES } from './data/passives.js';
import { WEAPONS, type WeaponId } from './data/weapons.js';
import { spawnBoss, updateBosses } from './entities/boss.js';
import { updateEnemies } from './systems/enemy-ai.js';
import { movePlayer } from './systems/movement.js';
import { updateSpawns } from './systems/spawn.js';
import { updateCollisions } from './systems/collision.js';
import { applyEnemyDamage, updatePlayerInvulnerability } from './systems/damage.js';
import { announcePickup, isEnemyFrozen, spawnPickupByKind, updatePickups } from './systems/pickup.js';
import { updateCrates } from './systems/crate.js';
import { shiftLevelEvent } from './systems/level.js';
import {
  applyLevelReward,
  createLevelRewardChoices,
  type LevelRewardChoice,
} from './systems/level-reward.js';
import { updateBossTimeline } from './systems/timeline.js';
import { claimTrialReward, updateTrialState } from './systems/trial.js';
import type { TimelineResultKind } from './systems/timeline.js';
import { equipWeapon, updateWeapons } from './systems/weapons.js';
import { recalcStats } from './systems/stats.js';
import { getReadyEvolutionForBaseWeapon, isEvolutionWeaponId } from './systems/evolution.js';
import { DEFAULT_CHARACTER_ID, getCharacterArchetype, type CharacterId } from './data/characters.js';
import { loadQuestionBank } from './quiz/loader.js';
import { gradeAnswer, type QuizGradeResult } from './quiz/grader.js';
import { selectQuestion, type SelectedQuestion } from './quiz/selector.js';
import { summarizeQuizStats } from './quiz/stats.js';
import { recordSessionResult } from './storage.js';
import type { Bank, Question } from '../shared/schema.js';

type RuntimeState = GameState & RenderScene;

interface ActiveQuiz {
  kind: 'level' | 'specialReward';
  selection: SelectedQuestion;
  phase: QuizModalState['phase'];
  firstAttemptFailed: boolean;
  specialReward?: SpecialRewardQuiz;
}

function resize(canvas: HTMLCanvasElement): { w: number; h: number } {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = Math.floor(window.innerWidth * dpr);
  const h = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h };
}

function readCharacterFromUrl(): CharacterId {
  const params = new URLSearchParams(window.location.search);
  const selected = params.get('character');
  if (selected === null) return DEFAULT_CHARACTER_ID;

  try {
    return getCharacterArchetype(selected as CharacterId).id;
  } catch {
    return DEFAULT_CHARACTER_ID;
  }
}

interface LaunchSelection {
  readonly selection: TitleSelection;
  readonly bank: Bank;
}

function createRuntimeState(bank: Bank, characterId: CharacterId = readCharacterFromUrl()): RuntimeState {
  const player = createPlayer(characterId);
  const state = createGameState({ player });
  state.quizSession.grade = bank.grade;
  equipWeapon(state.weapons, CHARACTER_PROFILES[player.characterId].startingWeaponId);
  applyResolvedStats(state);
  if (stressModeEnabled(window.location.search)) setupStressMode(state);
  return state;
}

function updateRuntimeState(state: RuntimeState, dt: number): void {
  updateTrialRuntime(state);
  if (state.trial.phase === 'active') return;

  syncPlayerIntent(state.player, state.input);
  movePlayer(state.player, dt, state.world);
  updateSpawns(state, dt);
  updateEnemies(state, dt);
  updateBossTimelineAndSpawns(state);
  if (!isEnemyFrozen(state.pickupRuntime)) {
    updateBosses(state.bosses, state.player.x, state.player.y, dt);
  }
  updatePlayerInvulnerability(state.player, dt);
  applyHealthRegen(state, dt);
  updateDamageNumbers(state.damageNumbers, dt);
}

function updateAfterCollisions(state: RuntimeState, dt: number): void {
  if (state.trial.phase === 'active') {
    state.entityCount = 1;
    return;
  }

  updateWeapons(state, state.weapons, dt);
  updateCrates(state, dt);
  updatePickups(state.pickups, state.player, state.level, state.pickupRuntime, dt);
  applyPendingMeteorDamage(state);
  state.entityCount =
    state.enemies.activeCount +
    state.crates.activeCount +
    state.weapons.projectiles.activeCount +
    state.pickups.activeCount +
    state.bosses.activeCount +
    1;
}

function updateTrialRuntime(state: RuntimeState): void {
  const event = updateTrialState(state.trial, state.elapsedSec);

  if (event === 'started') {
    state.enemies.releaseAll();
    state.bosses.releaseAll();
    state.weapons.projectiles.releaseAll();
    state.pickups.releaseAll();
    state.crates.releaseAll();
    state.spawn.accumulator = 0;
    state.crateSpawn.accumulator = 0;
  } else if (event === 'completed') {
    claimTrialReward(state.trial, state.weapons, state.passives, state.player);
    applyResolvedStats(state);
  }
}

function applyResolvedStats(state: RuntimeState): void {
  state.stats = recalcStats(state.baseStats, state.passives);
  state.player.maxHealth = state.stats.maxHealth;
  if (state.player.health > state.player.maxHealth) state.player.health = state.player.maxHealth;
  state.player.moveSpeed = state.stats.moveSpeed;
  state.player.projectileCount = state.stats.projectileCount;
  state.player.attackPowerMultiplier = state.stats.attackPowerMultiplier;
  state.player.attackRangeMultiplier = state.stats.attackRangeMultiplier;
  state.player.rangeMultiplier = state.stats.attackRangeMultiplier;
  state.player.cooldownMultiplier = state.stats.cooldownMultiplier;
  state.pickupRuntime.baseMagnetRadius = state.stats.magnetRadius;
}

function applyHealthRegen(state: RuntimeState, dt: number): void {
  if (state.stats.healthRegenPerSec <= 0 || state.player.health <= 0) return;
  state.player.health = Math.min(
    state.player.maxHealth,
    state.player.health + state.stats.healthRegenPerSec * dt,
  );
}

function updateBossTimelineAndSpawns(state: RuntimeState): void {
  const event = updateBossTimeline(
    state.timeline,
    state.elapsedSec,
    state.player.health,
    state.timeline.resultFired && state.timeline.latestResultKind === 'victory',
  );
  if (event !== 'spawn_boss') return;

  const boss = state.bosses.acquire();
  const definition = BOSSES[state.timeline.latestBossId];
  spawnBoss(
    boss,
    definition,
    state.player.x + state.viewport.width * 0.35,
    state.player.y - state.viewport.height * 0.25,
  );
}

/** 이리듐 운석은 맵 전체의 적을 친다. 아이템 설명과 플레이어 기대가 "전체 폭탄"에 가깝기 때문이다. */
function applyPendingMeteorDamage(state: RuntimeState): void {
  const damage = state.pickupRuntime.pendingMeteorDamage;
  if (damage <= 0) return;
  state.pickupRuntime.pendingMeteorDamage = 0;

  for (let i = state.enemies.activeCount - 1; i >= 0; i -= 1) {
    const enemy = state.enemies.items[i];
    applyEnemyDamage(state, enemy, damage);
  }
}

function createHudState(state: RuntimeState, frame: number): HudState {
  return {
    frame,
    elapsedSec: state.elapsedSec,
    chapter: resolveChapter(state.elapsedSec),
    level: state.level.level,
    xp: state.level.xp,
    xpRequired: state.level.xpForNextLevel,
    health: state.player.health,
    maxHealth: state.player.maxHealth,
    score: calculateScore(state),
    kills: state.combat.defeatedEnemies,
    quizCorrect: state.quizSession.stats.firstTryCorrect,
    quizTotal: state.quizSession.stats.attempted,
    noticeText: state.pickupRuntime.noticeText,
    weapons: createWeaponHudSlots(state),
    passives: createPassiveHudSlots(state),
  };
}

function calculateScore(state: RuntimeState): number {
  return Math.floor(state.elapsedSec) +
    state.combat.defeatedEnemies * 10 +
    state.level.totalXp +
    state.quizSession.stats.firstTryCorrect * 100 +
    state.level.level * 25;
}

function resolveChapter(elapsedSec: number): number {
  if (elapsedSec >= 360) return 3;
  if (elapsedSec >= 180) return 2;
  return 1;
}

function createWeaponHudSlots(state: RuntimeState): HudSlotState[] {
  return state.weapons.slots.map((slot) => {
    if (slot.id === null) return emptyHudSlot();
    const weapon = WEAPONS[slot.id];
    const evolutionReady = !isEvolutionWeaponId(slot.id) &&
      getReadyEvolutionForBaseWeapon(state.weapons, state.passives, slot.id) !== undefined;
    return {
      id: slot.id,
      label: weapon.name,
      level: slot.level,
      element: weapon.element,
      evolutionReady,
    };
  });
}

function createPassiveHudSlots(state: RuntimeState): HudSlotState[] {
  return state.passives.slots.map((slot) => {
    if (slot.id === null) return emptyHudSlot();
    const passive = PASSIVES[slot.id];
    return {
      id: slot.id,
      label: passive.name,
      level: slot.level,
      element: passive.element,
    };
  });
}

function emptyHudSlot(): HudSlotState {
  return {
    id: null,
    label: '',
    level: 0,
    element: '',
  };
}

async function bootstrap(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('#game 캔버스를 찾을 수 없습니다.');

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D 컨텍스트를 만들 수 없습니다.');

  canvas.style.display = 'none';
  const launch = await waitForLaunchSelection();
  canvas.style.display = 'block';

  const bank = launch.bank;
  const state = createRuntimeState(bank, launch.selection.characterId);
  const timer = createTimer();
  const overlay = createDebugOverlay();
  const hud: Hud = createHud();
  let activeQuiz: ActiveQuiz | undefined;
  let pendingRewardChoices: LevelRewardChoice[] = [];
  const quizModal: QuizModal = createQuizModal(document.body, {
    onSubmit(submission) {
      if (activeQuiz === undefined) return;
      const result = gradeAnswer(state.quizSession, {
        question: activeQuiz.selection.question,
        selectedAnswer: submission.answer,
        phase: activeQuiz.phase,
      });
      handleQuizResult(result);
    },
  });
  const skillChoice = createSkillChoiceView(document.body, {
    onChoose(choice) {
      applyLevelReward(state.weapons, state.passives, choice);
      applyResolvedStats(state);
      pendingRewardChoices = [];
      skillChoice.hide();
      activeQuiz = undefined;
      quizModal.hide();
      resumeAfterQuiz();
    },
  });
  const resultScreen = createResultScreen(document.body, {
    onRetry() {
      window.location.reload();
    },
    onChangeGrade() {
      window.location.href = window.location.pathname;
    },
  });
  const input = createInputController(canvas, state.input);
  let resultShown = false;

  function openNextQuiz(): boolean {
    const event = shiftLevelEvent(state.level);
    if (event === undefined) return false;

    const selection = selectQuestion(bank, 2, event.level, state.quizSession);
    activeQuiz = {
      kind: 'level',
      selection,
      phase: 'first',
      firstAttemptFailed: false,
    };
    quizModal.show(createQuizState(selection.question, activeQuiz.phase, selection.retry));
    return true;
  }

  function openNextSpecialRewardQuiz(): boolean {
    const reward = state.specialRewards.pendingQuizRewards.shift();
    if (reward === undefined) return false;

    const selection = selectQuestion(bank, 2, state.level.level, state.quizSession);
    activeQuiz = {
      kind: 'specialReward',
      selection,
      phase: 'first',
      firstAttemptFailed: false,
      specialReward: reward,
    };
    quizModal.show(createQuizState(selection.question, activeQuiz.phase, selection.retry));
    return true;
  }

  function handleQuizResult(result: QuizGradeResult): void {
    if (activeQuiz === undefined) return;

    quizModal.showResult(result, activeQuiz.selection.question.explanation);
    if (result.kind === 'try_again') {
      activeQuiz.firstAttemptFailed = true;
      activeQuiz.phase = 'retry';
      window.setTimeout(() => {
        if (activeQuiz === undefined) return;
        quizModal.show(createQuizState(activeQuiz.selection.question, 'retry', true));
      }, 700);
      return;
    }

    if (activeQuiz.kind === 'specialReward') {
      const reward = activeQuiz.specialReward;
      if (result.kind === 'correct' && reward !== undefined) {
        spawnPickupByKind(state.pickups, reward.pickupKind, reward.x, reward.y);
        announcePickup(state.pickupRuntime, reward.pickupKind);
      }
      window.setTimeout(() => {
        quizModal.hide();
        activeQuiz = undefined;
        resumeAfterQuiz();
      }, 700);
      return;
    }

    pendingRewardChoices = createLevelRewardChoices(
      state.weapons,
      state.passives,
      result.choicesOffered,
      state.quizSession.seed + state.level.level,
    );
    window.setTimeout(() => {
      quizModal.hide();
      if (pendingRewardChoices.length === 0) {
        activeQuiz = undefined;
        resumeAfterQuiz();
        return;
      }
      skillChoice.show(pendingRewardChoices);
    }, 700);
  }

  let size = resize(canvas);
  state.viewport.width = size.w;
  state.viewport.height = size.h;
  const renderer = createRenderer(ctx, { width: size.w, height: size.h, dpr: Math.min(window.devicePixelRatio, 2) });
  window.addEventListener('resize', () => {
    size = resize(canvas);
    state.viewport.width = size.w;
    state.viewport.height = size.h;
    renderer.resize({ width: size.w, height: size.h, dpr: Math.min(window.devicePixelRatio, 2) });
  });

  const loop = createLoop(state, {
    update(baseState, dt) {
      timer.begin('sim');
      updateRuntimeState(baseState as RuntimeState, dt);
      if (!resultShown && state.timeline.resultFired && state.timeline.latestResultKind !== 'none') {
        resultShown = true;
        showResultScreen(state, state.timeline.latestResultKind, resultScreen, launch.selection);
        loop.pause();
      }
      timer.end('sim');
      timer.begin('collide');
      updateCollisions(baseState as RuntimeState, dt);
      updateAfterCollisions(baseState as RuntimeState, dt);
      timer.end('collide');
      if (state.specialRewards.pendingQuizRewards.length > 0 && activeQuiz === undefined) {
        loop.pause();
        openNextSpecialRewardQuiz();
      } else if (state.level.queuedCount > 0 && activeQuiz === undefined) {
        loop.pause();
        openNextQuiz();
      }
    },

    render(baseState, alpha) {
      timer.begin('render');
      renderer.render(baseState as RuntimeState, alpha);
      timer.end('render');
    },

    onFrame(steps) {
      timer.endFrame(steps, state.entityCount, state.enemies.recycles);
      state.enemies.resetFrameStats();
      hud.update(createHudState(state, state.ticks));
      overlay.update(timer);
      timer.beginFrame();
    },
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (loop.paused) loop.resume();
      else loop.pause();
    }
    if (event.code === 'Backquote') overlay.toggle();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loop.resync();
  });

  window.addEventListener('beforeunload', () => {
    input.destroy();
    hud.destroy();
    quizModal.destroy();
    skillChoice.destroy();
    resultScreen.destroy();
  });

  timer.beginFrame();
  loop.start();

  function resumeAfterQuiz(): void {
    if (state.specialRewards.pendingQuizRewards.length > 0) {
      openNextSpecialRewardQuiz();
    } else if (state.level.queuedCount > 0) {
      openNextQuiz();
    } else if (!state.timeline.resultFired) {
      loop.resume();
    }
  }
}

function waitForLaunchSelection(): Promise<LaunchSelection> {
  return new Promise((resolve) => {
    const flow = createTitleFlow({
      loadBank: loadQuestionBank,
      onStart(selection, bank) {
        flow.destroy();
        resolve({ selection, bank });
      },
    });
    document.body.appendChild(flow.element);
  });
}

function showResultScreen(
  state: RuntimeState,
  result: Exclude<TimelineResultKind, 'none'>,
  resultScreen: ReturnType<typeof createResultScreen>,
  selection: TitleSelection,
): void {
  const quiz = summarizeQuizStats(state.quizSession.stats);
  const storage = recordSessionResult(window.localStorage, {
    survivalSec: state.elapsedSec,
    kills: state.combat.defeatedEnemies,
    score: calculateScore(state),
    level: state.level.level,
    quiz,
    lastChoice: {
      grade: selection.grade,
      semester: selection.term === 'all' ? 2 : selection.term,
      character: selection.characterId,
    },
  });
  resultScreen.show(createResultSummary(state, result, quiz, storage));
}

function createResultSummary(
  state: RuntimeState,
  result: Exclude<TimelineResultKind, 'none'>,
  quiz: ResultScreenSummary['quiz'],
  storage: ResultScreenSummary['storage'],
): ResultScreenSummary {
  return {
    result,
    survivalSec: state.elapsedSec,
    score: calculateScore(state),
    kills: state.combat.defeatedEnemies,
    level: state.level.level,
    weapons: createWeaponHudSlots(state).filter((slot) => slot.id !== null && !isEvolutionHudSlot(slot)),
    passives: createPassiveHudSlots(state).filter((slot) => slot.id !== null),
    evolutions: createWeaponHudSlots(state).filter(isEvolutionHudSlot),
    quiz,
    storage,
  };
}

function isEvolutionHudSlot(slot: HudSlotState): boolean {
  return slot.id !== null && isEvolutionWeaponId(slot.id as WeaponId);
}

function createQuizState(
  question: Question,
  phase: QuizModalState['phase'],
  retry: boolean,
): QuizModalState {
  return {
    question,
    phase,
    retry,
  };
}

void bootstrap();
