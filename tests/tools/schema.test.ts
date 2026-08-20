import { describe, expect, it } from 'vitest';
import { BankSchema, QuestionSchema, BANK_VERSION } from '../../shared/schema.js';
import { Domain, bandOf, STANDARD_PATTERN } from '../../shared/domain.js';

/**
 * shared/ 계약이 실제로 잘못된 문항을 막는지 확인한다.
 * 여기가 통과해야 빌드 검증(T-018)이 올라설 바닥이 생긴다.
 */

const valid = {
  id: 'G4-N-015-03',
  grade: 4,
  semester: 2,
  domain: Domain.Number,
  unit: '분수의 덧셈과 뺄셈',
  standard: '4수01-15',
  difficulty: 2,
  format: 'choice',
  stem: '3/5 + 1/5 는 얼마인가요?',
  choices: ['4/5', '4/10', '3/10', '2/5'],
  answer: '4/5',
  distractorReason: ['정답', '분모까지 더함', '분모끼리 더하고 분자는 뺌', '분자를 뺌'],
  explanation: '분모가 같으면 분자끼리 더합니다.',
  timeLimitSec: 15,
  misconceptionTag: 'fraction_denominator_add',
} as const;

describe('QuestionSchema', () => {
  it('정상_문항은_통과한다', () => {
    expect(QuestionSchema.safeParse(valid).success).toBe(true);
  });

  it('학년_범위를_벗어나면_거부한다', () => {
    expect(QuestionSchema.safeParse({ ...valid, grade: 2 }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...valid, grade: 7 }).success).toBe(false);
  });

  it('2022개정에_없는_영역명은_거부한다', () => {
    // '규칙성' 은 2015 개정 영역이다. 섞이면 영역 균형 출제가 깨진다
    expect(QuestionSchema.safeParse({ ...valid, domain: '규칙성' }).success).toBe(false);
  });

  it('성취기준_코드_형식이_아니면_거부한다', () => {
    for (const bad of ['9수01-15', '4수05-15', '4수01-1', '4수01', '']) {
      expect(QuestionSchema.safeParse({ ...valid, standard: bad }).success).toBe(false);
    }
  });

  it('오개념_태그가_비면_거부한다', () => {
    expect(QuestionSchema.safeParse({ ...valid, misconceptionTag: '' }).success).toBe(false);
  });

  it('응답_시간이_10에서_20초_밖이면_거부한다', () => {
    expect(QuestionSchema.safeParse({ ...valid, timeLimitSec: 9 }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...valid, timeLimitSec: 21 }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...valid, timeLimitSec: 20 }).success).toBe(true);
  });
});

describe('BankSchema', () => {
  it('빈_뱅크는_통과한다', () => {
    const bank = { version: BANK_VERSION, grade: 4, questions: [] };
    expect(BankSchema.safeParse(bank).success).toBe(true);
  });

  it('문항_하나라도_잘못되면_뱅크_전체가_거부된다', () => {
    const bank = {
      version: BANK_VERSION,
      grade: 4,
      questions: [valid, { ...valid, misconceptionTag: '' }],
    };
    expect(BankSchema.safeParse(bank).success).toBe(false);
  });

  it('알_수_없는_version은_거부한다', () => {
    const bank = { version: 99, grade: 4, questions: [] };
    expect(BankSchema.safeParse(bank).success).toBe(false);
  });
});

describe('domain 헬퍼', () => {
  it('학년군_접두를_올바르게_준다', () => {
    expect(bandOf(3)).toBe('4');
    expect(bandOf(4)).toBe('4');
    expect(bandOf(5)).toBe('6');
    expect(bandOf(6)).toBe('6');
  });

  it('성취기준_패턴이_실제_코드를_받는다', () => {
    for (const code of ['4수01-15', '4수03-24', '6수02-03', '6수04-01']) {
      expect(STANDARD_PATTERN.test(code)).toBe(true);
    }
  });
});
