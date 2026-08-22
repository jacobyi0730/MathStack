import type { Grade } from '../shared/domain.js';
import type { BossId } from './data/bosses.js';
import type { CharacterId } from './data/characters.js';
import { PASSIVES, type PassiveId } from './data/passives.js';
import { WEAPONS, type WeaponId } from './data/weapons.js';
import type { QuizStatsSummary } from './quiz/stats.js';
import type { TrialPhase } from './systems/trial.js';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface StoredBestRecord {
  survivalSec: number;
  kills: number;
  accuracy: number;
  score: number;
}

export interface StoredLastChoice {
  grade: Grade;
  semester: 1 | 2;
  character: CharacterId;
}

export interface StoredMisconception {
  wrong: number;
  converted: number;
}

export interface StoredRankingEntry {
  heroName: string;
  score: number;
  survivalSec: number;
  kills: number;
  level: number;
  grade: Grade;
}

export interface StoredContinueSelection {
  grade: Grade;
  term: 1 | 2 | 'all';
  characterId: CharacterId;
  heroName: string;
}

export interface StoredContinueSlot<TId extends string> {
  id: TId | null;
  level: number;
}

export interface StoredContinueBoss {
  id: BossId;
  hp: number;
  x: number;
  y: number;
}

export interface StoredContinueTrial {
  phase: TrialPhase;
  questionsAsked: number;
  correctAnswers: number;
  firstTryCorrectAnswers: number;
  rewardClaimed: boolean;
}

export interface StoredContinueRun {
  version: 1;
  selection: StoredContinueSelection;
  elapsedSec: number;
  playerHealth: number;
  level: number;
  xp: number;
  totalXp: number;
  weapons: Array<StoredContinueSlot<WeaponId>>;
  passives: Array<StoredContinueSlot<PassiveId>>;
  firedBossMask: number;
  trial: StoredContinueTrial;
  activeBosses: StoredContinueBoss[];
}

export interface MathStackStorageData {
  version: 1;
  best: StoredBestRecord;
  lastChoice: StoredLastChoice;
  misconceptions: Record<string, StoredMisconception>;
  rankings: StoredRankingEntry[];
  sessions: number;
}

export interface SessionRecordInput {
  survivalSec: number;
  kills: number;
  score: number;
  level: number;
  heroName: string;
  quiz: QuizStatsSummary;
  lastChoice?: StoredLastChoice;
}

export const MATHSTACK_STORAGE_KEY = 'mathstack.save.v1';
export const MATHSTACK_CONTINUE_KEY = 'mathstack.continue.v1';

export const DEFAULT_STORAGE_DATA: MathStackStorageData = {
  version: 1,
  best: {
    survivalSec: 0,
    kills: 0,
    accuracy: 0,
    score: 0,
  },
  lastChoice: {
    grade: 3,
    semester: 1,
    character: 'actinium',
  },
  misconceptions: {},
  rankings: [],
  sessions: 0,
};

export function readMathStackStorage(storage: StorageLike | undefined): MathStackStorageData {
  if (!storage) return cloneStorage(DEFAULT_STORAGE_DATA);
  const raw = storage.getItem(MATHSTACK_STORAGE_KEY);
  if (!raw) return cloneStorage(DEFAULT_STORAGE_DATA);

  try {
    return normalizeStorageData(JSON.parse(raw));
  } catch {
    return cloneStorage(DEFAULT_STORAGE_DATA);
  }
}

export function writeMathStackStorage(
  storage: StorageLike | undefined,
  data: MathStackStorageData,
): void {
  if (!storage) return;
  storage.setItem(MATHSTACK_STORAGE_KEY, JSON.stringify(normalizeStorageData(data)));
}

export function recordSessionResult(
  storage: StorageLike | undefined,
  input: SessionRecordInput,
): MathStackStorageData {
  const current = readMathStackStorage(storage);
  const next: MathStackStorageData = {
    ...current,
    best: {
      survivalSec: Math.max(current.best.survivalSec, Math.floor(input.survivalSec)),
      kills: Math.max(current.best.kills, Math.floor(input.kills)),
      accuracy: Math.max(current.best.accuracy, input.quiz.accuracy),
      score: Math.max(current.best.score, Math.floor(input.score)),
    },
    lastChoice: input.lastChoice ?? current.lastChoice,
    misconceptions: mergeMisconceptions(current.misconceptions, input.quiz),
    rankings: updateRankings(current.rankings, input),
    sessions: current.sessions + 1,
  };
  writeMathStackStorage(storage, next);
  clearContinueRun(storage);
  return next;
}

export function readContinueRun(storage: StorageLike | undefined): StoredContinueRun | null {
  if (!storage) return null;
  const raw = storage.getItem(MATHSTACK_CONTINUE_KEY);
  if (!raw) return null;

  try {
    return normalizeContinueRun(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeContinueRun(storage: StorageLike | undefined, data: StoredContinueRun): void {
  if (!storage) return;
  storage.setItem(MATHSTACK_CONTINUE_KEY, JSON.stringify(normalizeContinueRun(data)));
}

export function clearContinueRun(storage: StorageLike | undefined): void {
  if (!storage) return;
  if (storage.removeItem) storage.removeItem(MATHSTACK_CONTINUE_KEY);
  else storage.setItem(MATHSTACK_CONTINUE_KEY, '');
}

function normalizeStorageData(value: unknown): MathStackStorageData {
  if (!isRecord(value) || value.version !== 1) return cloneStorage(DEFAULT_STORAGE_DATA);

  return {
    version: 1,
    best: normalizeBest(value.best),
    lastChoice: normalizeLastChoice(value.lastChoice),
    misconceptions: normalizeMisconceptions(value.misconceptions),
    rankings: normalizeRankings(value.rankings),
    sessions: safeInteger(value.sessions),
  };
}

function normalizeContinueRun(value: unknown): StoredContinueRun | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.selection)) return null;
  const grade = Number(value.selection.grade);
  const term = parseContinueTerm(value.selection.term);
  const characterId = parseCharacter(value.selection.characterId);
  if (!isGrade(grade) || term === null || characterId === null) return null;

  return {
    version: 1,
    selection: {
      grade,
      term,
      characterId,
      heroName:
        typeof value.selection.heroName === 'string' && value.selection.heroName.trim()
          ? value.selection.heroName.trim()
          : '원소 용사',
    },
    elapsedSec: clampNumber(value.elapsedSec, 0, 599),
    playerHealth: clampNumber(value.playerHealth, 1, 9999),
    level: Math.max(1, safeInteger(value.level)),
    xp: safeInteger(value.xp),
    totalXp: safeInteger(value.totalXp),
    weapons: normalizeSlots(value.weapons, isWeaponId),
    passives: normalizeSlots(value.passives, isPassiveId),
    firedBossMask: safeInteger(value.firedBossMask),
    trial: normalizeContinueTrial(value.trial),
    activeBosses: normalizeContinueBosses(value.activeBosses),
  };
}

function normalizeBest(value: unknown): StoredBestRecord {
  if (!isRecord(value)) return { ...DEFAULT_STORAGE_DATA.best };
  return {
    survivalSec: safeInteger(value.survivalSec),
    kills: safeInteger(value.kills),
    accuracy: safeRatio(value.accuracy),
    score: safeInteger(value.score),
  };
}

function normalizeLastChoice(value: unknown): StoredLastChoice {
  if (!isRecord(value)) return { ...DEFAULT_STORAGE_DATA.lastChoice };
  const grade = Number(value.grade);
  const semester = Number(value.semester);
  const character = value.character;
  return {
    grade: grade === 1 || grade === 2 || grade === 3 || grade === 4 || grade === 5 || grade === 6 ? grade : 3,
    semester: semester === 2 ? 2 : 1,
    character:
      character === 'actinium' || character === 'thorium' || character === 'lanthanum' || character === 'cerium'
        ? character
        : 'actinium',
  };
}

function normalizeMisconceptions(value: unknown): Record<string, StoredMisconception> {
  if (!isRecord(value)) return {};
  const result: Record<string, StoredMisconception> = {};
  for (const [tag, item] of Object.entries(value)) {
    if (!isRecord(item)) continue;
    result[tag] = {
      wrong: safeInteger(item.wrong),
      converted: safeInteger(item.converted),
    };
  }
  return result;
}

function mergeMisconceptions(
  current: Record<string, StoredMisconception>,
  quiz: QuizStatsSummary,
): Record<string, StoredMisconception> {
  const next: Record<string, StoredMisconception> = {};
  for (const [tag, item] of Object.entries(current)) {
    next[tag] = { ...item };
  }
  for (const item of quiz.frequentMisconceptions) {
    next[item.tag] ??= { wrong: 0, converted: 0 };
    next[item.tag].wrong += item.wrong;
    next[item.tag].converted += item.converted;
  }
  return next;
}

function normalizeRankings(value: unknown): StoredRankingEntry[] {
  if (!Array.isArray(value)) return [];
  const bestByHero = new Map<string, StoredRankingEntry>();
  for (const entry of value
    .filter(isRecord)
    .map((item) => {
      const rawGrade = Number(item.grade);
      const grade: Grade =
        rawGrade === 1 || rawGrade === 2 || rawGrade === 3 || rawGrade === 4 || rawGrade === 5 || rawGrade === 6
          ? rawGrade
          : 3;
      return {
        heroName: normalizeHeroName(item.heroName),
        score: safeInteger(item.score),
        survivalSec: safeInteger(item.survivalSec),
        kills: safeInteger(item.kills),
        level: safeInteger(item.level),
        grade,
      };
    })) {
    const key = rankingHeroKey(entry.heroName);
    const current = bestByHero.get(key);
    if (!current || compareRanking(entry, current) < 0) bestByHero.set(key, entry);
  }
  return [...bestByHero.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function normalizeSlots<TId extends string>(
  value: unknown,
  isId: (id: unknown) => id is TId,
): Array<StoredContinueSlot<TId>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((item) => {
    if (!isRecord(item) || !isId(item.id)) return { id: null, level: 0 };
    return {
      id: item.id,
      level: Math.max(1, safeInteger(item.level)),
    };
  });
}

function normalizeContinueTrial(value: unknown): StoredContinueTrial {
  if (!isRecord(value)) {
    return {
      phase: 'pending',
      questionsAsked: 0,
      correctAnswers: 0,
      firstTryCorrectAnswers: 0,
      rewardClaimed: false,
    };
  }

  return {
    phase: value.phase === 'active' || value.phase === 'completed' ? value.phase : 'pending',
    questionsAsked: Math.min(3, safeInteger(value.questionsAsked)),
    correctAnswers: Math.min(3, safeInteger(value.correctAnswers)),
    firstTryCorrectAnswers: Math.min(3, safeInteger(value.firstTryCorrectAnswers)),
    rewardClaimed: value.rewardClaimed === true,
  };
}

function normalizeContinueBosses(value: unknown): StoredContinueBoss[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((item) => {
    if (!isBossId(item.id)) return [];
    return [{
      id: item.id,
      hp: clampNumber(item.hp, 1, 99999),
      x: clampNumber(item.x, -10000, 10000),
      y: clampNumber(item.y, -10000, 10000),
    }];
  }).slice(0, 3);
}

function parseContinueTerm(value: unknown): 1 | 2 | 'all' | null {
  if (value === 'all') return 'all';
  if (value === 1 || value === '1') return 1;
  if (value === 2 || value === '2') return 2;
  return null;
}

function isGrade(value: number): value is Grade {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
}

function parseCharacter(value: unknown): CharacterId | null {
  if (value === 'actinium' || value === 'thorium' || value === 'lanthanum' || value === 'cerium') return value;
  return null;
}

function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === 'string' && value in WEAPONS;
}

function isPassiveId(value: unknown): value is PassiveId {
  return typeof value === 'string' && value in PASSIVES;
}

function isBossId(value: unknown): value is BossId {
  return value === 'technetium' || value === 'polonium' || value === 'oganesson';
}

function updateRankings(
  current: readonly StoredRankingEntry[],
  input: SessionRecordInput,
): StoredRankingEntry[] {
  return normalizeRankings([
    ...current,
    {
      heroName: normalizeHeroName(input.heroName),
      score: Math.floor(input.score),
      survivalSec: Math.floor(input.survivalSec),
      kills: Math.floor(input.kills),
      level: Math.floor(input.level),
      grade: input.lastChoice?.grade ?? DEFAULT_STORAGE_DATA.lastChoice.grade,
    },
  ]);
}

function normalizeHeroName(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '원소 용사';
}

function rankingHeroKey(heroName: string): string {
  return heroName.toLocaleLowerCase('ko-KR');
}

function compareRanking(left: StoredRankingEntry, right: StoredRankingEntry): number {
  return right.score - left.score ||
    right.survivalSec - left.survivalSec ||
    right.kills - left.kills ||
    right.level - left.level;
}

function cloneStorage(data: MathStackStorageData): MathStackStorageData {
  return {
    version: 1,
    best: { ...data.best },
    lastChoice: { ...data.lastChoice },
    misconceptions: normalizeMisconceptions(data.misconceptions),
    rankings: normalizeRankings(data.rankings),
    sessions: data.sessions,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function safeInteger(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function safeRatio(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function clampNumber(value: unknown, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
