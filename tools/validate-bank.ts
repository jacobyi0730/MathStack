import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  DIFFICULTIES,
  DOMAINS,
  DOMAIN_QUOTA,
  type Difficulty,
  type Domain,
  GRADES,
  type Grade,
} from '../shared/domain.js';
import {
  isExcluded,
  isStandardForGrade,
  isStandardForSemester,
  lookupStandard,
} from '../shared/curriculum.js';
import { BankSchema, type Bank, type Question } from '../shared/schema.js';
import { bankPath } from './paths.js';

export interface ValidationFailure {
  id: string;
  message: string;
}

export interface DomainCount {
  domain: Domain;
  count: number;
  ratio: number;
  target: number;
  ok: boolean;
}

export interface BankValidationReport {
  grade: Grade;
  total: number;
  domainCounts: DomainCount[];
  difficultyCounts: Record<Difficulty, number>;
  failures: ValidationFailure[];
}

export interface ValidationSummary {
  reports: BankValidationReport[];
  failures: ValidationFailure[];
}

const DOMAIN_QUOTA_TOLERANCE = 0.05;
const CORRECT_REASON_LABEL = '정답';

function countAnswer(question: Question): number {
  return question.choices.filter((choice) => choice === question.answer).length;
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function validateQuestion(question: Question): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const standardInfo = lookupStandard(question.standard);

  if (standardInfo === undefined) {
    failures.push({ id: question.id, message: `unknown standard ${question.standard}` });
  } else {
    if (!isStandardForGrade(standardInfo, question.grade)) {
      failures.push({
        id: question.id,
        message: `grade/standard mismatch grade ${question.grade} standard ${question.standard}`,
      });
    }

    if (!isStandardForSemester(standardInfo, question.grade, question.semester)) {
      failures.push({
        id: question.id,
        message: `semester/standard mismatch semester ${question.semester} standard ${question.standard}`,
      });
    }

    if (question.domain !== standardInfo.domain) {
      failures.push({
        id: question.id,
        message: `domain/standard mismatch domain "${question.domain}" standard ${question.standard}`,
      });
    }

    if (isExcluded(question.standard)) {
      failures.push({ id: question.id, message: `excluded standard ${question.standard}` });
    }
  }

  if (isBlank(question.misconceptionTag)) {
    failures.push({ id: question.id, message: 'missing misconceptionTag' });
  }

  if (question.distractorReason.length !== question.choices.length) {
    failures.push({
      id: question.id,
      message: `distractorReason length ${question.distractorReason.length} does not match choices ${question.choices.length}`,
    });
  }

  if (question.distractorReason.some(isBlank)) {
    failures.push({ id: question.id, message: 'empty distractorReason' });
  }

  if (
    question.distractorReason.length > 0 &&
    question.distractorReason.every((reason) => reason.trim() === CORRECT_REASON_LABEL)
  ) {
    failures.push({ id: question.id, message: 'distractorReason repeats only correct-answer label' });
  }

  const answerCount = countAnswer(question);
  if (answerCount !== 1) {
    failures.push({
      id: question.id,
      message: `answer "${question.answer}" appears ${answerCount} times in choices`,
    });
  }

  for (const duplicate of duplicateValues(question.choices)) {
    failures.push({ id: question.id, message: `duplicate choice "${duplicate}"` });
  }

  if (question.timeLimitSec < 10 || question.timeLimitSec > 20) {
    failures.push({ id: question.id, message: `timeLimitSec ${question.timeLimitSec} is outside 10..20` });
  }

  return failures;
}

function countDomains(questions: readonly Question[]): DomainCount[] {
  return DOMAINS.map((domain) => {
    const count = questions.filter((question) => question.domain === domain).length;
    const ratio = questions.length === 0 ? 0 : count / questions.length;
    const target = DOMAIN_QUOTA[domain];

    return {
      domain,
      count,
      ratio,
      target,
      ok: ratio + DOMAIN_QUOTA_TOLERANCE >= target,
    };
  });
}

function countDifficulties(questions: readonly Question[]): Record<Difficulty, number> {
  const counts = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, 0])) as Record<Difficulty, number>;

  for (const question of questions) {
    counts[question.difficulty] += 1;
  }

  return counts;
}

export function validateBank(bank: Bank): BankValidationReport {
  const failures: ValidationFailure[] = [];

  if (bank.questions.some((question) => question.grade !== bank.grade)) {
    failures.push({ id: `bank-g${bank.grade}.json`, message: 'bank grade does not match every question grade' });
  }

  for (const question of bank.questions) {
    failures.push(...validateQuestion(question));
  }

  const domainCounts = countDomains(bank.questions);
  for (const entry of domainCounts) {
    if (!entry.ok) {
      failures.push({
        id: `bank-g${bank.grade}.json`,
        message: `domain quota unmet ${entry.domain} ${formatPercent(entry.ratio)} target ${formatTarget(entry.target)}`,
      });
    }
  }

  const difficultyCounts = countDifficulties(bank.questions);
  for (const difficulty of DIFFICULTIES) {
    if (difficultyCounts[difficulty] < 1) {
      failures.push({ id: `bank-g${bank.grade}.json`, message: `difficulty ${difficulty} has no questions` });
    }
  }

  return {
    grade: bank.grade,
    total: bank.questions.length,
    domainCounts,
    difficultyCounts,
    failures,
  };
}

async function loadBank(grade: Grade, failures: ValidationFailure[]): Promise<Bank | null> {
  const file = bankPath(grade);
  let raw: string;

  try {
    raw = await readFile(file, 'utf8');
  } catch {
    failures.push({ id: `bank-g${grade}.json`, message: 'file not found; run npm run build:bank first' });
    return null;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch (error) {
    failures.push({ id: `bank-g${grade}.json`, message: `invalid JSON: ${(error as Error).message}` });
    return null;
  }

  const parsed = BankSchema.safeParse(json);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      failures.push({ id: `bank-g${grade}.json`, message: `${issue.path.join('.')}: ${issue.message}` });
    }
    return null;
  }

  return parsed.data;
}

export function summarizeReports(
  reports: readonly BankValidationReport[],
  loadFailures: readonly ValidationFailure[] = [],
): ValidationSummary {
  const failures = [...loadFailures, ...reports.flatMap((report) => report.failures)];
  return { reports: [...reports], failures };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1).padStart(5)}%`;
}

function formatTarget(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatReport(summary: ValidationSummary): string {
  const lines: string[] = [];

  for (const report of summary.reports) {
    lines.push(`bank-g${report.grade}.json  ${report.total} questions`);

    for (const entry of report.domainCounts) {
      lines.push(
        `  ${entry.domain.padEnd(8)} ${String(entry.count).padStart(4)} (${formatPercent(entry.ratio)})  target ${formatTarget(
          entry.target,
        ).padStart(3)}  ${entry.ok ? 'OK' : 'FAIL'}`,
      );
    }

    const difficultyLine = DIFFICULTIES.map((difficulty) => `${difficulty}:${report.difficultyCounts[difficulty]}`).join(
      ' ',
    );
    const difficultyOk = DIFFICULTIES.every((difficulty) => report.difficultyCounts[difficulty] >= 1);
    lines.push(`  difficulty ${difficultyLine}  ${difficultyOk ? 'OK' : 'FAIL'}`);
  }

  if (summary.failures.length > 0) {
    lines.push('');
    for (const failure of summary.failures) {
      lines.push(`FAIL  ${failure.id}  ${failure.message}`);
    }
    lines.push(`${summary.failures.length} error(s); build aborted`);
  } else {
    const total = summary.reports.reduce((sum, report) => sum + report.total, 0);
    lines.push(`validate:bank  ${total} questions, 0 errors`);
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const loadFailures: ValidationFailure[] = [];
  const reports: BankValidationReport[] = [];

  for (const grade of GRADES) {
    const bank = await loadBank(grade, loadFailures);
    if (bank === null) continue;

    reports.push(validateBank(bank));
  }

  const summary = summarizeReports(reports, loadFailures);
  const output = formatReport(summary);

  if (summary.failures.length > 0) {
    console.error(output);
    process.exit(1);
  }

  console.log(output);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error('validate:bank failed:', error);
    process.exit(1);
  });
}
