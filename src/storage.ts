import type { Grade } from '../shared/domain.js';
import type { CharacterId } from './data/characters.js';
import type { QuizStatsSummary } from './quiz/stats.js';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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
  score: number;
  survivalSec: number;
  kills: number;
  level: number;
  grade: Grade;
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
  quiz: QuizStatsSummary;
  lastChoice?: StoredLastChoice;
}

export const MATHSTACK_STORAGE_KEY = 'mathstack.save.v1';

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
  return next;
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
  return value
    .filter(isRecord)
    .map((item) => {
      const rawGrade = Number(item.grade);
      const grade: Grade =
        rawGrade === 1 || rawGrade === 2 || rawGrade === 3 || rawGrade === 4 || rawGrade === 5 || rawGrade === 6
          ? rawGrade
          : 3;
      return {
        score: safeInteger(item.score),
        survivalSec: safeInteger(item.survivalSec),
        kills: safeInteger(item.kills),
        level: safeInteger(item.level),
        grade,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function updateRankings(
  current: readonly StoredRankingEntry[],
  input: SessionRecordInput,
): StoredRankingEntry[] {
  return normalizeRankings([
    ...current,
    {
      score: Math.floor(input.score),
      survivalSec: Math.floor(input.survivalSec),
      kills: Math.floor(input.kills),
      level: Math.floor(input.level),
      grade: input.lastChoice?.grade ?? DEFAULT_STORAGE_DATA.lastChoice.grade,
    },
  ]);
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
