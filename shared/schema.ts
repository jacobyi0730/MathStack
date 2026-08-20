import { z } from 'zod';
import { Domain, STANDARD_PATTERN } from './domain.js';

/**
 * 문항·뱅크 계약. **정의는 여기 한 곳뿐이다** (31-아키텍처 §3).
 *
 * tools/ 는 이 스키마로 굽고, src/ 는 이 스키마로 읽는다.
 * 어느 쪽이든 같은 모양의 interface 를 따로 만들고 있다면 그건 버그다.
 *
 * 필드 의미는 33-데이터스키마 참조.
 * TODO(T-016): 교차 필드 refine(정답 유일성·근거 개수 일치)과
 *              curriculum.ts 대조 검증을 여기에 붙인다.
 */

export const GradeSchema = z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);
export const SemesterSchema = z.union([z.literal(1), z.literal(2)]);
export const DifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const DomainSchema = z.enum([
  Domain.Number,
  Domain.Relation,
  Domain.Geometry,
  Domain.Data,
]);

export const QuestionSchema = z.object({
  /** <학년>-<영역>-<성취기준일련>-<변형>. 예: G4-N-015-03 */
  id: z.string().min(1),

  grade: GradeSchema,
  semester: SemesterSchema,
  domain: DomainSchema,
  unit: z.string().min(1),

  /** 2022 개정 성취기준 코드 */
  standard: z.string().regex(STANDARD_PATTERN, '성취기준 코드 형식이 아닙니다 (예: 4수01-15)'),

  difficulty: DifficultySchema,
  format: z.enum(['choice', 'number_input']),

  stem: z.string().min(1),
  choices: z.array(z.string()).min(2),
  answer: z.string().min(1),

  /** choices 와 같은 길이. 각 선택지가 어떤 오개념인지 (33-데이터스키마 §3) */
  distractorReason: z.array(z.string()),

  explanation: z.string().min(1),

  /** 10~20초. 넘기면 게임이 학습지가 된다 */
  timeLimitSec: z.number().int().min(10).max(20),

  /** 오답 복습 재출제의 키. 비워두지 않는다 */
  misconceptionTag: z.string().min(1),
});

export type Question = z.infer<typeof QuestionSchema>;

export const BANK_VERSION = 1;

export const BankSchema = z.object({
  /** 스키마가 바뀌면 올린다. 옛 산출물로 크래시나지 않게 */
  version: z.literal(BANK_VERSION),
  grade: GradeSchema,
  questions: z.array(QuestionSchema),
});

export type Bank = z.infer<typeof BankSchema>;
