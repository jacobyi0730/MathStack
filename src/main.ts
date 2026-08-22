import './styles.css';
import { createBgmPlayer, resolveBgmTrack } from './audio/bgm.js';
import { createSfxPlayer } from './audio/sfx.js';
import { flushSfxQueue, requestSfx } from './audio/queue.js';
import { createGameState, type GameState, type SpecialRewardQuiz } from './engine/state.js';
import { resetEffects, updateScreenEffects, updateWorldEffects } from './engine/effects.js';
import { createLoop } from './engine/loop.js';
import { setupStressMode, stressModeEnabled } from './engine/stress.js';
import { createTimer } from './engine/timing.js';
import { createRenderer, type RenderScene } from './engine/renderer.js';
import { createDebugOverlay } from './ui/debug-overlay.js';
import { createHud, type Hud, type HudSlotState, type HudState } from './ui/hud.js';
import { createQuizModal, type QuizModal, type QuizModalState } from './ui/quiz-modal.js';
import { createResultScreen, type ResultScreenSummary } from './ui/result.js';
import { createPauseMenu } from './ui/pause-menu.js';
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
import { releaseAllBossHazards, updateBossHazards } from './systems/boss-hazard.js';
import { updateBossPatterns } from './systems/boss-patterns.js';
import {
  feedbackBossSpawn,
  feedbackLevelUp,
  feedbackMeteor,
  feedbackPlayerDown,
} from './systems/feedback.js';
import { announcePickup, isEnemyFrozen, spawnPickupByKind, updatePickups } from './systems/pickup.js';
import { updateCrates } from './systems/crate.js';
import { shiftLevelEvent } from './systems/level.js';
import {
  applyLevelReward,
  createLevelRewardChoices,
  type LevelRewardChoice,
} from './systems/level-reward.js';
import { publishQuit, updateBossTimeline } from './systems/timeline.js';
import {
  claimTrialReward,
  recordTrialAnswer,
  selectTrialQuestion,
  updateTrialState,
} from './systems/trial.js';
import type { TimelineResultKind } from './systems/timeline.js';
import { equipWeapon, updateWeapons } from './systems/weapons.js';
import { recalcStats } from './systems/stats.js';
import { getReadyEvolutionForBaseWeapon, isEvolutionWeaponId } from './systems/evolution.js';
import { DEFAULT_CHARACTER_ID, getCharacterArchetype, type CharacterId } from './data/characters.js';
import { getRequiredXpForLevel } from './data/level.js';
import { loadQuestionBank } from './quiz/loader.js';
import { gradeAnswer, type QuizGradeResult } from './quiz/grader.js';
import { selectQuestion, type SelectedQuestion } from './quiz/selector.js';
import { createRuntimeQuizSeed } from './quiz/session.js';
import { summarizeQuizStats } from './quiz/stats.js';
import {
  recordSessionResult,
  writeContinueRun,
  type StoredContinueRun,
} from './storage.js';
import {
  effectiveEffectIntensity,
  readAccessibilitySettings,
  resolveBgmVolume,
  resolveSfxVolume,
  writeAccessibilitySettings,
  type AccessibilitySettings,
} from './ui/settings.js';
import type { Bank, Question } from '../shared/schema.js';
import type { PassiveId } from './data/passives.js';

type RuntimeState = GameState & RenderScene;

interface ActiveQuiz {
  kind: 'level' | 'specialReward' | 'trial';
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
  readonly continueRun?: StoredContinueRun;
}

function createRuntimeState(
  bank: Bank,
  characterId: CharacterId = readCharacterFromUrl(),
  continueRun?: StoredContinueRun,
): RuntimeState {
  const player = createPlayer(characterId);
  const state = createGameState({ player });
  state.quizSession.grade = bank.grade;
  if (continueRun === undefined) {
    state.quizSession.seed = createRuntimeQuizSeed();
    equipWeapon(state.weapons, CHARACTER_PROFILES[player.characterId].startingWeaponId);
  } else {
    restoreContinueRun(state, continueRun);
  }
  applyResolvedStats(state);
  if (continueRun !== undefined) state.player.health = Math.min(continueRun.playerHealth, state.player.maxHealth);
  if (stressModeEnabled(window.location.search)) setupStressMode(state);
  return state;
}

function restoreContinueRun(state: RuntimeState, saved: StoredContinueRun): void {
  state.elapsedSec = saved.elapsedSec;
  state.level.level = saved.level;
  state.level.xp = saved.xp;
  state.level.totalXp = saved.totalXp;
  state.level.xpForNextLevel = getRequiredXpForLevel(saved.level);
  state.timeline.firedBossMask = saved.firedBossMask;
  state.trial.phase = saved.trial.phase;
  state.trial.questionsAsked = saved.trial.questionsAsked;
  state.trial.correctAnswers = saved.trial.correctAnswers;
  state.trial.firstTryCorrectAnswers = saved.trial.firstTryCorrectAnswers;
  state.trial.rewardClaimed = saved.trial.rewardClaimed;

  for (let i = 0; i < state.weapons.slots.length; i += 1) {
    const savedSlot = saved.weapons[i];
    const slot = state.weapons.slots[i];
    slot.id = savedSlot?.id ?? null;
    slot.level = savedSlot?.id === null || savedSlot === undefined ? 0 : savedSlot.level;
    slot.cooldownRemainingSec = 0;
  }

  for (let i = 0; i < state.passives.slots.length; i += 1) {
    const savedSlot = saved.passives[i];
    const slot = state.passives.slots[i];
    slot.id = savedSlot?.id ?? null;
    slot.level = savedSlot?.id === null || savedSlot === undefined ? 0 : savedSlot.level;
  }

  for (const savedBoss of saved.activeBosses) {
    const boss = state.bosses.acquire();
    spawnBoss(boss, BOSSES[savedBoss.id], savedBoss.x, savedBoss.y);
    boss.hp = Math.min(savedBoss.hp, boss.maxHp);
  }
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
  updateBossPatterns(state, dt);
  updateBossHazards(state, dt);
  updatePlayerInvulnerability(state.player, dt);
  applyHealthRegen(state, dt);
  updateDamageNumbers(state.damageNumbers, dt);
  updateWorldEffects(state.effects, dt);
  decayBossFlashes(state, dt);
}

/**
 * 보스 피격 섬광을 잦아들게 한다.
 *
 * 잡몹은 `updateEnemies` 가 같은 일을 하지만, 보스는 세슘 시계로 멈춰 있는 동안에도
 * 갱신돼야 한다 — 멈춘 보스가 하얗게 굳어 있으면 버그로 보인다.
 */
function decayBossFlashes(state: RuntimeState, dt: number): void {
  for (let i = 0; i < state.bosses.activeCount; i += 1) {
    const boss = state.bosses.items[i];
    if (boss.flashSec <= 0) continue;
    boss.flashSec -= dt;
    if (boss.flashSec < 0) boss.flashSec = 0;
  }
}

function updateAfterCollisions(state: RuntimeState, dt: number): void {
  if (state.trial.phase === 'active') {
    state.entityCount = 1;
    return;
  }

  updateWeapons(state, state.weapons, dt);
  updateCrates(state, dt);
  updatePickups(state.pickups, state.player, state.level, state.pickupRuntime, dt, state);
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
    releaseAllBossHazards(state.bossHazards);
    resetEffects(state.effects);
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
  state.enemies.releaseAll();
  releaseAllBossHazards(state.bossHazards);
  state.spawn.accumulator = 0;
  spawnBoss(
    boss,
    definition,
    state.player.x + state.viewport.width * 0.35,
    state.player.y - state.viewport.height * 0.25,
  );
  feedbackBossSpawn(state, boss);
}

/** 이리듐 운석은 맵 전체의 적을 친다. 아이템 설명과 플레이어 기대가 "전체 폭탄"에 가깝기 때문이다. */
function applyPendingMeteorDamage(state: RuntimeState): void {
  const damage = state.pickupRuntime.pendingMeteorDamage;
  if (damage <= 0) return;
  state.pickupRuntime.pendingMeteorDamage = 0;
  feedbackMeteor(state);

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

  let settings = readAccessibilitySettings(window.localStorage);
  // 타이틀 화면이 떠 있는 동안 음원을 미리 받아 둔다. 전투가 시작된 뒤 받으면
  // 첫 타격음이 안 난다 — 24개 합쳐 200KB 남짓이라 선택 화면 시간이면 충분하다
  const sfx = createSfxPlayer(resolveAudioOptions(settings));
  // 배경음은 반대다. 트랙 하나가 500KB 라 **필요해질 때** 받는다
  const bgm = createBgmPlayer({ volume: resolveBgmVolume(settings) });
  // 브라우저는 사용자 조작 전에는 소리를 못 내게 막는다. 어떤 입력이든 첫 번째에 푼다
  unlockAudioOnFirstInput(sfx, bgm);

  canvas.style.display = 'none';
  const launch = await waitForLaunchSelection();
  canvas.style.display = 'block';

  const bank = launch.bank;
  const state = createRuntimeState(bank, launch.selection.characterId, launch.continueRun);
  // 타이틀의 설정 화면에서 바꿨을 수 있다. 시작 직전에 한 번 더 읽는다
  settings = readAccessibilitySettings(window.localStorage);
  sfx.setVolume(resolveSfxVolume(settings));
  sfx.setMuted(settings.sfxVolume <= 0);
  bgm.setVolume(resolveBgmVolume(settings));
  state.effects.intensity = effectiveEffectIntensity(settings) / 100;
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

  /**
   * 일시정지 메뉴.
   *
   * **`loop.pause()` 를 직접 부르지 않는다.** 문제 모달·스킬 선택도 같은 루프를 멈추므로,
   * 메뉴를 닫을 때 그것들이 열려 있으면 재개하면 안 된다. `resumeAfterQuiz()` 가
   * 그 판단을 이미 하고 있으니 그대로 쓴다.
   */
  const pauseMenu = createPauseMenu(document.body, {
    onResume(): void {
      pauseMenu.hide();
      resumeAfterQuiz();
    },
    onQuit(): void {
      pauseMenu.hide();
      if (!publishQuit(state.timeline)) return;
      resultShown = true;
      flushSfxQueue(state.sfx, sfx);
      bgm.setTrack(null);
      showResultScreen(state, 'quit', resultScreen, launch.selection);
    },
    onSettingsChange(next): void {
      applySettings(next);
    },
  });

  function applySettings(next: AccessibilitySettings): void {
    settings = next;
    writeAccessibilitySettings(window.localStorage, next);
    sfx.setVolume(resolveSfxVolume(next));
    sfx.setMuted(next.sfxVolume <= 0);
    bgm.setVolume(resolveBgmVolume(next));
    state.effects.intensity = effectiveEffectIntensity(next) / 100;
  }

  function openPauseMenu(): void {
    if (pauseMenu.open || resultShown) return;
    // 문제 모달이 떠 있는 동안에는 열지 않는다. 화면 두 장이 겹치면 아이가 길을 잃는다
    if (activeQuiz !== undefined || pendingRewardChoices.length > 0) return;
    loop.pause();
    pauseMenu.show(settings);
  }

  hud.settingsButton.addEventListener('click', openPauseMenu);

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
    feedbackLevelUp(state);
    requestSfx(state.sfx, 'quiz-open');
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

  function openNextTrialQuiz(): boolean {
    const question = selectTrialQuestion(bank, 2, state.quizSession, state.trial);
    if (question === undefined) {
      finishTrialReward();
      return false;
    }

    activeQuiz = {
      kind: 'trial',
      selection: { question, retry: false },
      phase: 'first',
      firstAttemptFailed: false,
    };
    quizModal.show(createQuizState(question, activeQuiz.phase, false));
    return true;
  }

  function handleQuizResult(result: QuizGradeResult): void {
    if (activeQuiz === undefined) return;

    // 오답 소리는 부드럽게 내려가는 음이다. 부저를 쓰면 "오답은 처벌이 아니다"가 깨진다
    requestSfx(state.sfx, result.kind === 'correct' ? 'quiz-correct' : 'quiz-wrong');
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

    if (activeQuiz.kind === 'trial') {
      recordTrialAnswer(state.trial, result.kind === 'correct', !activeQuiz.firstAttemptFailed);
      window.setTimeout(() => {
        quizModal.hide();
        activeQuiz = undefined;
        if (state.trial.phase === 'completed') {
          finishTrialReward();
          resumeAfterQuiz();
        } else {
          openNextTrialQuiz();
        }
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
      // 히트스톱: 시뮬레이션만 멈춘다. 화면 흔들림은 계속 흘러야 "얼어붙었다"로 읽힌다
      if (state.effects.hitStopSec > 0) {
        state.effects.hitStopSec -= dt;
        if (state.effects.hitStopSec < 0) state.effects.hitStopSec = 0;
        updateScreenEffects(state.effects, dt);
        return;
      }

      timer.begin('sim');
      updateScreenEffects(state.effects, dt);
      updateRuntimeState(baseState as RuntimeState, dt);
      if (!resultShown && state.timeline.resultFired && state.timeline.latestResultKind !== 'none') {
        resultShown = true;
        if (state.timeline.latestResultKind === 'defeat') feedbackPlayerDown(state);
        else requestSfx(state.sfx, 'victory');
        flushSfxQueue(state.sfx, sfx);
        bgm.setTrack(null);
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
      } else if (state.trial.phase === 'active' && activeQuiz === undefined) {
        loop.pause();
        openNextTrialQuiz();
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
      // 소리는 프레임이 끝날 때 한 번만 낸다. 시뮬레이션 안에서는 요청만 쌓였다
      flushSfxQueue(state.sfx, sfx);
      // 트랙이 그대로면 아무 일도 하지 않는다. 챕터가 넘어가거나 보스가 뜰 때만 바뀐다
      if (!resultShown) bgm.setTrack(resolveBgmTrack(state.elapsedSec, state.bosses.activeCount > 0));
      timer.endFrame(steps, state.entityCount, state.enemies.recycles);
      state.enemies.resetFrameStats();
      hud.update(createHudState(state, state.ticks));
      overlay.update(timer);
      timer.beginFrame();
    },
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (pauseMenu.open) {
        pauseMenu.hide();
        resumeAfterQuiz();
      } else {
        openPauseMenu();
      }
      return;
    }
    // 메뉴가 떠 있는 동안 스페이스로 몰래 재개할 수 있으면 멈춘 게 아니다
    if (event.code === 'Space' && !pauseMenu.open) {
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
    saveContinueIfAlive(state, launch.selection, resultShown);
    input.destroy();
    sfx.destroy();
    bgm.destroy();
    pauseMenu.destroy();
    hud.destroy();
    quizModal.destroy();
    skillChoice.destroy();
    resultScreen.destroy();
  });

  timer.beginFrame();
  loop.start();

  function resumeAfterQuiz(): void {
    // 메뉴가 떠 있으면 재개하지 않는다. 문제를 푼 직후 메뉴를 연 경우가 여기다
    if (pauseMenu.open) return;
    if (state.specialRewards.pendingQuizRewards.length > 0) {
      openNextSpecialRewardQuiz();
    } else if (state.trial.phase === 'active') {
      openNextTrialQuiz();
    } else if (state.level.queuedCount > 0) {
      openNextQuiz();
    } else if (!state.timeline.resultFired) {
      loop.resume();
    }
  }

  function finishTrialReward(): void {
    claimTrialReward(state.trial, state.weapons, state.passives, state.player);
    applyResolvedStats(state);
  }
}

function resolveAudioOptions(settings: AccessibilitySettings): { volume: number; muted: boolean } {
  const volume = resolveSfxVolume(settings);
  return { volume, muted: volume <= 0 };
}

/**
 * 첫 사용자 조작에서 오디오를 푼다.
 *
 * 브라우저는 자동 재생을 막으므로 `AudioContext` 는 **조작 안에서** 만들어야 한다.
 * 세 종류를 다 듣는 이유는 입력 방식이 셋이기 때문이다 — 키보드, 마우스, 터치.
 * 한 번 성공하면 스스로 떨어져 나간다.
 */
function unlockAudioOnFirstInput(...players: readonly { unlock(): void }[]): void {
  const unlock = (): void => {
    for (const player of players) player.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock, { passive: true });
}

function waitForLaunchSelection(): Promise<LaunchSelection> {
  return new Promise((resolve) => {
    const flow = createTitleFlow({
      loadBank: loadQuestionBank,
      onStart(selection, bank) {
        flow.destroy();
        resolve({ selection, bank });
      },
      onContinue(selection, bank, saved) {
        flow.destroy();
        resolve({ selection, bank, continueRun: saved });
      },
    });
    document.body.appendChild(flow.element);
  });
}

function saveContinueIfAlive(state: RuntimeState, selection: TitleSelection, resultShown: boolean): void {
  if (resultShown || state.player.health <= 0 || state.timeline.resultFired) return;

  writeContinueRun(window.localStorage, {
    version: 1,
    selection,
    elapsedSec: state.elapsedSec,
    playerHealth: state.player.health,
    level: state.level.level,
    xp: state.level.xp,
    totalXp: state.level.totalXp,
    weapons: state.weapons.slots.map((slot) => ({ id: slot.id, level: slot.level })),
    passives: state.passives.slots.map((slot) => ({ id: slot.id as PassiveId | null, level: slot.level })),
    firedBossMask: state.timeline.firedBossMask,
    trial: {
      phase: state.trial.phase,
      questionsAsked: state.trial.questionsAsked,
      correctAnswers: state.trial.correctAnswers,
      firstTryCorrectAnswers: state.trial.firstTryCorrectAnswers,
      rewardClaimed: state.trial.rewardClaimed,
    },
    activeBosses: state.bosses.items.slice(0, state.bosses.activeCount).map((boss) => ({
      id: boss.id,
      hp: boss.hp,
      x: boss.x,
      y: boss.y,
    })),
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
    heroName: selection.heroName,
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
