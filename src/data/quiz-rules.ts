import { DIFFICULTIES, DOMAIN_QUOTA, DOMAINS, Domain } from '../../shared/domain.js';
import type { Difficulty, Domain as DomainType } from '../../shared/domain.js';

export const QUIZ_SESSION_TARGET_QUESTIONS = 18;
export const DOMAIN_FORCE_LAG_QUESTIONS = 2;

export type DifficultyWeight = {
  difficulty: Difficulty;
  weight: number;
};

export const LEVEL_DIFFICULTY_DISTRIBUTIONS: readonly {
  minLevel: number;
  maxLevel: number;
  weights: readonly DifficultyWeight[];
}[] = [
  { minLevel: 1, maxLevel: 3, weights: [{ difficulty: 1, weight: 1 }] },
  {
    minLevel: 4,
    maxLevel: 7,
    weights: [
      { difficulty: 1, weight: 0.4 },
      { difficulty: 2, weight: 0.6 },
    ],
  },
  {
    minLevel: 8,
    maxLevel: 11,
    weights: [
      { difficulty: 2, weight: 0.5 },
      { difficulty: 3, weight: 0.5 },
    ],
  },
  {
    minLevel: 12,
    maxLevel: 15,
    weights: [
      { difficulty: 3, weight: 0.5 },
      { difficulty: 4, weight: 0.5 },
    ],
  },
  {
    minLevel: 16,
    maxLevel: Number.POSITIVE_INFINITY,
    weights: [
      { difficulty: 4, weight: 0.6 },
      { difficulty: 5, weight: 0.4 },
    ],
  },
];

export const DOMAIN_TARGET_COUNTS: Record<DomainType, number> = {
  [Domain.Number]: 8,
  [Domain.Relation]: 3,
  [Domain.Geometry]: 5,
  [Domain.Data]: 2,
};

export function getDifficultyDistribution(level: number): readonly DifficultyWeight[] {
  const clampedLevel = Math.max(1, Math.floor(level));
  const rule = LEVEL_DIFFICULTY_DISTRIBUTIONS.find(
    (entry) => clampedLevel >= entry.minLevel && clampedLevel <= entry.maxLevel,
  );

  return rule?.weights ?? LEVEL_DIFFICULTY_DISTRIBUTIONS[0].weights;
}

export function getDifficultyExpansionOrder(difficulty: Difficulty): readonly Difficulty[] {
  const order: Difficulty[] = [difficulty];

  for (let offset = 1; offset < DIFFICULTIES.length; offset += 1) {
    const lower = difficulty - offset;
    const upper = difficulty + offset;

    if (lower >= DIFFICULTIES[0]) {
      order.push(lower as Difficulty);
    }

    if (upper <= DIFFICULTIES[DIFFICULTIES.length - 1]) {
      order.push(upper as Difficulty);
    }
  }

  return order;
}

export function getForcedDomain(
  domainCounts: Readonly<Record<DomainType, number>>,
  askedCount: number,
): DomainType | undefined {
  let forcedDomain: DomainType | undefined;
  let biggestLag = DOMAIN_FORCE_LAG_QUESTIONS;
  const nextQuestionNumber = Math.min(askedCount + 1, QUIZ_SESSION_TARGET_QUESTIONS);

  for (const domain of DOMAINS) {
    const expected = DOMAIN_QUOTA[domain] * nextQuestionNumber;
    const lag = expected - domainCounts[domain];

    if (lag >= biggestLag) {
      biggestLag = lag;
      forcedDomain = domain;
    }
  }

  return forcedDomain;
}
