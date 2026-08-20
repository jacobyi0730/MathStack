import './styles.css';
import { createGameState, type GameState } from './engine/state.js';
import { createLoop } from './engine/loop.js';
import { setupStressMode, stressModeEnabled } from './engine/stress.js';
import { createTimer } from './engine/timing.js';
import { createRenderer, type RenderScene } from './engine/renderer.js';
import { createDebugOverlay } from './ui/debug-overlay.js';
import { createHud, type Hud, type HudSlotState, type HudState } from './ui/hud.js';
import { createQuizModal, type QuizModal, type QuizModalState } from './ui/quiz-modal.js';
import { createResultScreen, type ResultScreenSummary } from './ui/result.js';
import { createSkillChoiceView } from './ui/skill-choice.js';
import { createInputController } from './engine/input.js';
import { createPlayer, syncPlayerIntent } from './entities/player.js';
import { BOSSES } from './data/bosses.js';
import { PASSIVES } from './data/passives.js';
import { WEAPONS, type WeaponId } from './data/weapons.js';
import { spawnBoss, updateBosses } from './entities/boss.js';
import { updateEnemies } from './systems/enemy-ai.js';
import { movePlayer } from './systems/movement.js';
import { updateSpawns } from './systems/spawn.js';
import { updateCollisions } from './systems/collision.js';
import { applyEnemyDamage, updatePlayerInvulnerability } from './systems/damage.js';
import { consumeCombatRewardsAsPickups, updatePickups } from './systems/pickup.js';
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
import type { Grade } from '../shared/domain.js';
import type { Bank, Question } from '../shared/schema.js';

type RuntimeState = GameState & RenderScene;

interface ActiveQuiz {
  selection: SelectedQuestion;
  phase: QuizModalState['phase'];
  firstAttemptFailed: boolean;
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

function readGradeFromUrl(): Grade {
  const selected = Number(new URLSearchParams(window.location.search).get('grade'));
  return selected === 4 || selected === 5 || selected === 6 ? selected : 3;
}

function createRuntimeState(bank: Bank): RuntimeState {
  const player = createPlayer(readCharacterFromUrl());
  const state = createGameState({ player });
  state.quizSession.grade = bank.grade;
  equipWeapon(state.weapons, 'hydrogen_arrow');
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
  updateBosses(state.bosses, state.player.x, state.player.y, dt);
  updatePlayerInvulnerability(state.player, dt);
  applyHealthRegen(state, dt);
}

function updateAfterCollisions(state: RuntimeState, dt: number): void {
  if (state.trial.phase === 'active') {
    state.entityCount = 1;
    return;
  }

  updateWeapons(state, state.weapons, dt);
  consumeCombatRewardsAsPickups(state.combat, state.pickups, state.player.x, state.player.y);
  updatePickups(state.pickups, state.player, state.level, state.pickupRuntime, dt);
  applyPendingMeteorDamage(state);
  state.entityCount =
    state.enemies.activeCount +
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
    state.spawn.accumulator = 0;
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

function applyPendingMeteorDamage(state: RuntimeState): void {
  const damage = state.pickupRuntime.pendingMeteorDamage;
  if (damage <= 0) return;
  state.pickupRuntime.pendingMeteorDamage = 0;

  for (let i = state.enemies.activeCount - 1; i >= 0; i -= 1) {
    applyEnemyDamage(state, state.enemies.items[i], damage);
  }
}

function createHudState(state: RuntimeState, frame: number): HudState {
  return {
    frame,
    elapsedSec: state.elapsedSec,
    level: state.level.level,
    xp: state.level.xp,
    xpRequired: state.level.xpForNextLevel,
    health: state.player.health,
    maxHealth: state.player.maxHealth,
    kills: state.combat.defeatedEnemies,
    quizCorrect: state.quizSession.stats.firstTryCorrect,
    quizTotal: state.quizSession.stats.attempted,
    weapons: createWeaponHudSlots(state),
    passives: createPassiveHudSlots(state),
  };
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

  const bank = await loadQuestionBank(readGradeFromUrl());
  const state = createRuntimeState(bank);
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
      if (state.level.queuedCount > 0) {
        openNextQuiz();
      } else if (!state.timeline.resultFired) {
        loop.resume();
      }
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
      selection,
      phase: 'first',
      firstAttemptFailed: false,
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

    pendingRewardChoices = createLevelRewardChoices(
      state.weapons,
      state.passives,
      result.choicesOffered,
      state.quizSession.seed + state.level.level,
    );
    window.setTimeout(() => {
      quizModal.hide();
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
        showResultScreen(state, state.timeline.latestResultKind, resultScreen);
        loop.pause();
      }
      timer.end('sim');
      timer.begin('collide');
      updateCollisions(baseState as RuntimeState, dt);
      updateAfterCollisions(baseState as RuntimeState, dt);
      timer.end('collide');
      if (state.level.queuedCount > 0 && activeQuiz === undefined) {
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
}

function showResultScreen(
  state: RuntimeState,
  result: Exclude<TimelineResultKind, 'none'>,
  resultScreen: ReturnType<typeof createResultScreen>,
): void {
  const quiz = summarizeQuizStats(state.quizSession.stats);
  const storage = recordSessionResult(window.localStorage, {
    survivalSec: state.elapsedSec,
    kills: state.combat.defeatedEnemies,
    quiz,
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
    remainingSec: question.timeLimitSec,
    totalSec: question.timeLimitSec,
  };
}

void bootstrap();
