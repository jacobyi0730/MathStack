import { describe, expect, it } from 'vitest';
import { Domain } from '../../shared/domain.js';
import { BANK_VERSION, type Bank, type Question } from '../../shared/schema.js';
import { createPlayer } from '../../src/entities/player.js';
import { createPassiveRuntime } from '../../src/systems/stats.js';
import {
  TRIAL_END_SEC,
  TRIAL_START_SEC,
  claimTrialReward,
  createTrialState,
  recordTrialAnswer,
  resolveTrialReward,
  selectTrialQuestion,
  updateTrialState,
} from '../../src/systems/trial.js';
import { createWeaponRuntime, equipWeapon } from '../../src/systems/weapons.js';
import { createQuizSession } from '../../src/quiz/session.js';

function makeQuestion(id: string, difficulty: Question['difficulty']): Question {
  return {
    id,
    grade: 3,
    semester: 1,
    domain: Domain.Number,
    unit: 'trial',
    standard: '4??1-03',
    difficulty,
    format: 'choice',
    stem: `${id}?`,
    choices: ['1', '2', '3'],
    answer: '1',
    distractorReason: ['correct', 'misread', 'near miss'],
    explanation: 'because',
    timeLimitSec: 10,
    misconceptionTag: 'trial_tag',
  };
}

describe('transcendence trial', () => {
  it('starts_at_eight_minutes_and_completes_at_nine_minutes', () => {
    const trial = createTrialState();

    expect(updateTrialState(trial, TRIAL_START_SEC - 0.1)).toBe('none');
    expect(updateTrialState(trial, TRIAL_START_SEC)).toBe('started');
    expect(trial.phase).toBe('active');
    expect(updateTrialState(trial, TRIAL_END_SEC)).toBe('completed');
    expect(trial.phase).toBe('completed');
  });

  it('selects_three_difficulty_four_or_five_questions', () => {
    const bank: Bank = {
      version: BANK_VERSION,
      grade: 3,
      questions: [makeQuestion('easy', 3), makeQuestion('hard-1', 4), makeQuestion('hard-2', 5), makeQuestion('hard-3', 4)],
    };
    const session = createQuizSession(3, 1);
    const trial = createTrialState();
    updateTrialState(trial, TRIAL_START_SEC);

    const selected = [
      selectTrialQuestion(bank, 1, session, trial),
      selectTrialQuestion(bank, 1, session, trial),
      selectTrialQuestion(bank, 1, session, trial),
      selectTrialQuestion(bank, 1, session, trial),
    ];

    expect(selected.slice(0, 3).every((question) => question !== undefined)).toBe(true);
    expect(selected.slice(0, 3).map((question) => question?.difficulty).sort()).toEqual([4, 4, 5]);
    expect(selected[3]).toBeUndefined();
  });

  it('maps_correct_counts_to_rewards', () => {
    expect(resolveTrialReward(3)).toBe('evolution');
    expect(resolveTrialReward(2)).toBe('weapon_passive_level');
    expect(resolveTrialReward(1)).toBe('weapon_level');
    expect(resolveTrialReward(0)).toBe('full_heal');
  });

  it('grants_an_evolution_for_three_correct_answers_without_a_paired_passive', () => {
    const trial = createTrialState();
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    const player = createPlayer('hydrogen');

    equipWeapon(weapons, 'hydrogen_arrow');
    recordThreeCorrectAnswers(trial);

    const result = claimTrialReward(trial, weapons, passives, player);

    expect(result).toEqual({
      kind: 'evolution',
      evolutionId: 'heavy_hydrogen_storm',
      applied: true,
    });
    expect(weapons.slots[0]).toMatchObject({ id: 'heavy_hydrogen_storm', level: 5 });
    expect(passives.slots[0].id).toBeNull();
  });

  it('fully_heals_zero_correct_answers_so_the_player_never_leaves_empty_handed', () => {
    const trial = createTrialState();
    const weapons = createWeaponRuntime();
    const passives = createPassiveRuntime();
    const player = createPlayer('hydrogen');
    player.health = 10;

    const result = claimTrialReward(trial, weapons, passives, player);

    expect(result).toMatchObject({ kind: 'full_heal', applied: true });
    expect(player.health).toBe(player.maxHealth);
  });
});

function recordThreeCorrectAnswers(trial: ReturnType<typeof createTrialState>): void {
  updateTrialState(trial, TRIAL_START_SEC);
  for (let i = 0; i < 3; i += 1) {
    trial.questionsAsked += 1;
    recordTrialAnswer(trial, true, true);
  }
}
