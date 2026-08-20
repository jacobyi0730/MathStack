import { PASSIVES, type PassiveId } from '../data/passives.js';
import { WEAPON_EVOLUTION_LEVEL, WEAPONS, type EvolutionWeaponId } from '../data/weapons.js';
import type { Player } from '../entities/player.js';
import type { Bank, Question } from '../../shared/schema.js';
import type { Difficulty, Semester } from '../../shared/domain.js';
import { applyEvolution } from './evolution.js';
import { equipPassive, type PassiveRuntime } from './stats.js';
import { equipWeapon, type WeaponRuntime, type WeaponSlotRuntime } from './weapons.js';
import { nextRandom, rememberQuestion, type QuizSessionState } from '../quiz/session.js';

export type TrialPhase = 'pending' | 'active' | 'completed';
export type TrialEventKind = 'none' | 'started' | 'completed';
export type TrialRewardKind = 'evolution' | 'weapon_passive_level' | 'weapon_level' | 'full_heal';

export interface TrialState {
  phase: TrialPhase;
  eventSeq: number;
  latestEventKind: TrialEventKind;
  startedAtSec: number;
  completedAtSec: number;
  questionsAsked: number;
  correctAnswers: number;
  firstTryCorrectAnswers: number;
  selectedQuestionIds: string[];
  rewardClaimed: boolean;
  latestRewardKind: TrialRewardKind | 'none';
  latestEvolutionId: EvolutionWeaponId | null;
}

export interface TrialRewardResult {
  kind: TrialRewardKind;
  evolutionId: EvolutionWeaponId | null;
  applied: boolean;
}

export const TRIAL_START_SEC = 480;
export const TRIAL_END_SEC = 540;
export const TRIAL_QUESTION_COUNT = 3;
export const TRIAL_DIFFICULTIES = [4, 5] as const satisfies readonly Difficulty[];

export function createTrialState(): TrialState {
  return {
    phase: 'pending',
    eventSeq: 0,
    latestEventKind: 'none',
    startedAtSec: 0,
    completedAtSec: 0,
    questionsAsked: 0,
    correctAnswers: 0,
    firstTryCorrectAnswers: 0,
    selectedQuestionIds: [],
    rewardClaimed: false,
    latestRewardKind: 'none',
    latestEvolutionId: null,
  };
}

export function updateTrialState(trial: TrialState, elapsedSec: number): TrialEventKind {
  trial.latestEventKind = 'none';

  if (trial.phase === 'pending' && elapsedSec >= TRIAL_START_SEC) {
    trial.phase = 'active';
    trial.startedAtSec = TRIAL_START_SEC;
    trial.eventSeq += 1;
    trial.latestEventKind = 'started';
    return 'started';
  }

  if (trial.phase === 'active' && elapsedSec >= TRIAL_END_SEC) {
    completeTrial(trial, TRIAL_END_SEC);
    return 'completed';
  }

  return 'none';
}

export function completeTrial(trial: TrialState, elapsedSec: number): void {
  if (trial.phase === 'completed') return;
  trial.phase = 'completed';
  trial.completedAtSec = elapsedSec;
  trial.eventSeq += 1;
  trial.latestEventKind = 'completed';
}

export function selectTrialQuestion(
  bank: Bank,
  semester: Semester,
  session: QuizSessionState,
  trial: TrialState,
): Question | undefined {
  if (trial.phase !== 'active' || trial.questionsAsked >= TRIAL_QUESTION_COUNT) {
    return undefined;
  }

  const seen = new Set([...session.askedQuestionIds, ...trial.selectedQuestionIds]);
  const candidates = bank.questions.filter(
    (question) =>
      question.grade === bank.grade &&
      question.semester <= semester &&
      isTrialDifficulty(question.difficulty) &&
      !seen.has(question.id),
  );
  const fallback = bank.questions.filter(
    (question) =>
      question.grade === bank.grade &&
      question.semester <= semester &&
      isTrialDifficulty(question.difficulty),
  );
  const pool = candidates.length > 0 ? candidates : fallback;

  if (pool.length === 0) {
    return undefined;
  }

  const question = pool[Math.floor(nextRandom(session) * pool.length)];
  trial.questionsAsked += 1;
  trial.selectedQuestionIds.push(question.id);
  rememberQuestion(session, question);
  return question;
}

export function recordTrialAnswer(trial: TrialState, correct: boolean, firstTryCorrect: boolean): void {
  if (trial.phase !== 'active') return;
  if (correct) trial.correctAnswers += 1;
  if (firstTryCorrect) trial.firstTryCorrectAnswers += 1;
  if (trial.questionsAsked >= TRIAL_QUESTION_COUNT) completeTrial(trial, TRIAL_END_SEC);
}

export function claimTrialReward(
  trial: TrialState,
  weapons: WeaponRuntime,
  passives: PassiveRuntime,
  player: Player,
): TrialRewardResult {
  if (trial.rewardClaimed) {
    return {
      kind: trial.latestRewardKind === 'none' ? 'full_heal' : trial.latestRewardKind,
      evolutionId: trial.latestEvolutionId,
      applied: false,
    };
  }

  trial.rewardClaimed = true;
  const reward = resolveTrialReward(trial.correctAnswers);
  trial.latestRewardKind = reward;

  if (reward === 'evolution') {
    const evolutionId = findHighestLevelEvolutionCandidate(weapons);
    trial.latestEvolutionId = evolutionId;
    const applied = evolutionId !== null && applyEvolution(weapons, evolutionId).applied;
    return { kind: reward, evolutionId, applied };
  }

  if (reward === 'weapon_passive_level') {
    const weaponApplied = levelHighestWeapon(weapons);
    const passiveApplied = levelBestPassive(passives, weapons);
    return { kind: reward, evolutionId: null, applied: weaponApplied || passiveApplied };
  }

  if (reward === 'weapon_level') {
    return { kind: reward, evolutionId: null, applied: levelHighestWeapon(weapons) };
  }

  player.health = player.maxHealth;
  return { kind: reward, evolutionId: null, applied: true };
}

export function resolveTrialReward(correctAnswers: number): TrialRewardKind {
  if (correctAnswers >= 3) return 'evolution';
  if (correctAnswers === 2) return 'weapon_passive_level';
  if (correctAnswers === 1) return 'weapon_level';
  return 'full_heal';
}

function findHighestLevelEvolutionCandidate(weapons: WeaponRuntime): EvolutionWeaponId | null {
  let bestSlot: WeaponSlotRuntime | undefined;
  let bestEvolution: EvolutionWeaponId | undefined;

  for (let i = 0; i < weapons.slots.length; i += 1) {
    const slot = weapons.slots[i];
    if (slot.id === null) continue;
    const definition = WEAPONS[slot.id];
    if (!('evolvesTo' in definition) || definition.evolvesTo === undefined) continue;
    if (bestSlot !== undefined && slot.level < bestSlot.level) continue;
    bestSlot = slot;
    bestEvolution = definition.evolvesTo;
  }

  if (bestSlot !== undefined && bestSlot.level < WEAPON_EVOLUTION_LEVEL) {
    bestSlot.level = WEAPON_EVOLUTION_LEVEL;
  }

  return bestEvolution ?? null;
}

function isTrialDifficulty(difficulty: Difficulty): difficulty is (typeof TRIAL_DIFFICULTIES)[number] {
  return difficulty === 4 || difficulty === 5;
}

function levelHighestWeapon(weapons: WeaponRuntime): boolean {
  let bestSlot: WeaponSlotRuntime | undefined;

  for (let i = 0; i < weapons.slots.length; i += 1) {
    const slot = weapons.slots[i];
    if (slot.id === null) continue;
    if (bestSlot !== undefined && slot.level < bestSlot.level) continue;
    bestSlot = slot;
  }

  if (bestSlot === undefined) return equipWeapon(weapons, 'hydrogen_arrow');
  if (bestSlot.level < WEAPON_EVOLUTION_LEVEL) bestSlot.level += 1;
  return true;
}

function levelBestPassive(passives: PassiveRuntime, weapons: WeaponRuntime): boolean {
  const pairedPassive = findPairedPassiveForHighestWeapon(weapons);
  if (pairedPassive !== null) return equipPassive(passives, pairedPassive);
  return equipPassive(passives, 'silicon');
}

function findPairedPassiveForHighestWeapon(weapons: WeaponRuntime): PassiveId | null {
  let bestSlot: WeaponSlotRuntime | undefined;
  let passiveId: PassiveId | undefined;

  for (let i = 0; i < weapons.slots.length; i += 1) {
    const slot = weapons.slots[i];
    if (slot.id === null) continue;
    const id = slot.id;
    const definition = WEAPONS[id];
    if (!('evolvesWith' in definition) || definition.evolvesWith === undefined) continue;
    if (bestSlot !== undefined && slot.level < bestSlot.level) continue;
    bestSlot = slot;
    passiveId = definition.evolvesWith;
  }

  if (passiveId !== undefined && passiveId in PASSIVES) return passiveId;
  return null;
}
