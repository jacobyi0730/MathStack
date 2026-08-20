import { describe, expect, it } from 'vitest';
import { Domain, type Difficulty, type Grade, type Semester } from '../../shared/domain.js';
import { BANK_VERSION, type Bank, type Question } from '../../shared/schema.js';
import { formatReport, summarizeReports, validateBank } from '../../tools/validate-bank.js';

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 'Q-OK',
    grade: 4,
    semester: 2,
    domain: Domain.Number,
    unit: 'unit',
    standard: '4수01-15',
    difficulty: 2,
    format: 'choice',
    stem: '1/5 + 2/5 = ?',
    choices: ['3/5', '3/10', '1/5', '4/5'],
    answer: '3/5',
    distractorReason: ['정답', 'denominator added', 'one numerator ignored', 'numerator overcounted'],
    explanation: 'Add numerators when denominators are equal.',
    timeLimitSec: 15,
    misconceptionTag: 'fraction_denominator_add',
    ...overrides,
  };
}

function bank(questions: Question[], grade: Grade = questions[0]?.grade ?? 4): Bank {
  return {
    version: BANK_VERSION,
    grade,
    questions,
  };
}

function messagesFor(...questions: Question[]): string[] {
  return validateBank(bank(questions)).failures.map((failure) => failure.message);
}

describe('validateBank', () => {
  it('catches unknown standards', () => {
    expect(messagesFor(question({ standard: '4수01-99' }))).toContain('unknown standard 4수01-99');
  });

  it('catches grade/standard mismatches', () => {
    expect(messagesFor(question({ grade: 5, standard: '4수01-15' }))).toContain(
      'grade/standard mismatch grade 5 standard 4수01-15',
    );
  });

  it('catches semester/standard mismatches', () => {
    expect(messagesFor(question({ semester: 1 }))).toContain(
      'semester/standard mismatch semester 1 standard 4수01-15',
    );
  });

  it('catches missing misconception tags', () => {
    expect(messagesFor(question({ misconceptionTag: '   ' }))).toContain('missing misconceptionTag');
  });

  it('catches distractor reason length mismatches', () => {
    expect(messagesFor(question({ distractorReason: ['정답'] }))).toContain(
      'distractorReason length 1 does not match choices 4',
    );
  });

  it('catches empty distractor reasons', () => {
    expect(messagesFor(question({ distractorReason: ['정답', '', 'reason', 'reason'] }))).toContain(
      'empty distractorReason',
    );
  });

  it('catches reasons that only repeat the correct label', () => {
    expect(messagesFor(question({ distractorReason: ['정답', '정답', '정답', '정답'] }))).toContain(
      'distractorReason repeats only correct-answer label',
    );
  });

  it('catches answers that are not unique in choices', () => {
    expect(messagesFor(question({ choices: ['3/5', '3/5', '1/5', '4/5'] }))).toContain(
      'answer "3/5" appears 2 times in choices',
    );
  });

  it('catches duplicate choices', () => {
    expect(messagesFor(question({ choices: ['3/5', '3/10', '3/10', '4/5'] }))).toContain(
      'duplicate choice "3/10"',
    );
  });

  it('catches excluded standards', () => {
    expect(
      messagesFor(
        question({
          standard: '4수03-07',
          domain: Domain.Geometry,
          semester: 2,
          unit: 'circle',
        }),
      ),
    ).toContain('excluded standard 4수03-07');
  });

  it('catches domain quota misses', () => {
    expect(messagesFor(question())).toContain(`domain quota unmet ${Domain.Geometry}   0.0% target 30%`);
  });

  it('catches difficulty distribution misses', () => {
    expect(messagesFor(question({ difficulty: 1 }))).toContain('difficulty 2 has no questions');
  });

  it('catches answer time outside 10..20 seconds', () => {
    expect(messagesFor(question({ timeLimitSec: 21 }))).toContain('timeLimitSec 21 is outside 10..20');
  });

  it('prints grade reports and failure lists', () => {
    const report = validateBank(bank([question({ difficulty: 1 as Difficulty, semester: 2 as Semester })]));
    const output = formatReport(summarizeReports([report]));

    expect(output).toContain('bank-g4.json  1 questions');
    expect(output).toContain('difficulty 1:1');
    expect(output).toContain('FAIL  bank-g4.json');
  });
});
