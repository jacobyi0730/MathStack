import { mkdir, writeFile } from 'node:fs/promises';
import { GRADES, type Grade } from '../shared/domain.js';
import { BANK_VERSION, BankSchema, type Bank, type Question } from '../shared/schema.js';
import { loadFixedQuestions } from './fixed.js';
import { DATA_DIR, bankPath } from './paths.js';
import { expandTemplate, loadTemplates } from './template.js';

/**
 * 문항 뱅크를 굽는다. content/ → public/data/bank-gN.json
 *
 * T-002 단계에서는 빈 뱅크만 산출한다. 파이프라인이 Netlify에서
 * 실제로 도는지 확인하는 것이 목적이다.
 * TODO(T-017): content/templates/*.ts 전개 + content/fixed/*.yaml 병합.
 *
 * 산출은 **결정적이어야 한다.** 타임스탬프처럼 실행마다 바뀌는 값을
 * 넣지 않는다 — 같은 입력이 같은 해시를 내야 회귀 테스트가 성립한다.
 */

async function collectQuestions(grade: Grade): Promise<Question[]> {
  const [templates, fixedQuestions] = await Promise.all([loadTemplates(), loadFixedQuestions()]);

  const expanded = templates
    .filter((template) => template.grade === grade)
    .flatMap((template) => expandTemplate(template));

  return [...expanded, ...fixedQuestions.filter((question) => question.grade === grade)].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

async function buildBank(grade: Grade): Promise<Bank> {
  const bank: Bank = {
    version: BANK_VERSION,
    grade,
    questions: await collectQuestions(grade),
  };
  // 굽는 쪽에서도 한 번 통과시킨다. 스키마를 어긴 산출물은 나가지 않는다.
  return BankSchema.parse(bank);
}

async function main(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  let total = 0;
  for (const grade of GRADES) {
    const bank = await buildBank(grade);
    // 키 순서를 스키마 순서로 고정 + 개행 종료 → 해시가 안정적이다
    await writeFile(bankPath(grade), `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
    total += bank.questions.length;
    console.log(`  bank-g${grade}.json  ${bank.questions.length} questions`);
  }

  console.log(`build:bank  ${GRADES.length} banks, ${total} questions`);
}

main().catch((err: unknown) => {
  console.error('build:bank 실패:', err);
  process.exit(1);
});
