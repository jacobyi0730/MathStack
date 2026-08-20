import { readFile } from 'node:fs/promises';
import { GRADES, type Grade } from '../shared/domain.js';
import { BankSchema, type Bank } from '../shared/schema.js';
import { bankPath } from './paths.js';

/**
 * 문항 뱅크 검증. **빌드가 곧 검증이다** (31-아키텍처 §6).
 *
 * 실패는 경고가 아니라 process.exit(1) 이다.
 * 잘못된 문항이 배포되느니 배포가 실패하는 게 낫다.
 *
 * T-002 단계에서는 스키마 파싱만 한다.
 * TODO(T-018): 성취기준 실재·학년 정합성·정답 유일성·영역 비중 등
 *              33-데이터스키마 §4 의 12개 검사를 붙인다.
 */

const errors: string[] = [];

async function loadBank(grade: Grade): Promise<Bank | null> {
  const file = bankPath(grade);
  let raw: string;

  try {
    raw = await readFile(file, 'utf8');
  } catch {
    errors.push(`bank-g${grade}.json 이 없습니다. 먼저 npm run build:bank 을 실행하세요.`);
    return null;
  }

  const parsed = BankSchema.safeParse(JSON.parse(raw) as unknown);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`bank-g${grade}.json  ${issue.path.join('.')}: ${issue.message}`);
    }
    return null;
  }

  return parsed.data;
}

async function main(): Promise<void> {
  let total = 0;

  for (const grade of GRADES) {
    const bank = await loadBank(grade);
    if (!bank) continue;

    total += bank.questions.length;
    console.log(`  bank-g${grade}.json  ${bank.questions.length} questions  OK`);
  }

  if (errors.length > 0) {
    console.error('');
    for (const e of errors) console.error(`FAIL  ${e}`);
    console.error(`\n${errors.length} error(s) — build aborted`);
    process.exit(1);
  }

  console.log(`validate:bank  ${total} questions, 0 errors`);
}

main().catch((err: unknown) => {
  console.error('validate:bank 실패:', err);
  process.exit(1);
});
