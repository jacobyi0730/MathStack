import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTENT_DIR } from './paths.js';
import { QuestionSchema, type Question } from '../shared/schema.js';

type Scalar = string | number;
type FixedQuestionDraft = Partial<Record<keyof Question, unknown>>;

function parseScalar(value: string): Scalar {
  if (/^-?\d+$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseYamlQuestions(source: string, file: string): Question[] {
  const questions: FixedQuestionDraft[] = [];
  let current: FixedQuestionDraft | null = null;
  let currentArrayKey: keyof Question | null = null;

  const lines = source.split(/\r?\n/);
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    if (rawLine.startsWith('- ')) {
      current = {};
      questions.push(current);
      currentArrayKey = null;

      const remainder = rawLine.slice(2).trim();
      if (remainder.length > 0) {
        const separator = remainder.indexOf(':');
        if (separator === -1) {
          throw new Error(`${file}: 잘못된 YAML 항목입니다: ${rawLine}`);
        }
        const key = remainder.slice(0, separator).trim() as keyof Question;
        const value = remainder.slice(separator + 1).trim();
        current[key] = parseScalar(value);
      }
      continue;
    }

    if (!current) {
      throw new Error(`${file}: 문항 배열 바깥에서 값을 읽었습니다.`);
    }

    if (rawLine.startsWith('  - ')) {
      if (!currentArrayKey) {
        throw new Error(`${file}: 배열 키 없이 목록 항목이 나왔습니다.`);
      }
      const array = current[currentArrayKey];
      if (!Array.isArray(array)) {
        throw new Error(`${file}: 배열 키 ${String(currentArrayKey)} 의 값이 배열이 아닙니다.`);
      }
      array.push(parseScalar(rawLine.slice(4).trim()));
      continue;
    }

    const match = /^ {2}([A-Za-z][A-Za-z0-9]*):(?:\s(.*))?$/.exec(rawLine);
    if (!match) {
      throw new Error(`${file}: 지원하지 않는 YAML 구문입니다: ${rawLine}`);
    }

    const key = match[1] as keyof Question;
    const value = match[2];

    if (value === undefined || value.length === 0) {
      current[key] = [];
      currentArrayKey = key;
      continue;
    }

    current[key] = parseScalar(value.trim());
    currentArrayKey = null;
  }

  return questions.map((question) => QuestionSchema.parse(question));
}

export async function loadFixedQuestions(): Promise<Question[]> {
  const fixedDir = path.join(CONTENT_DIR, 'fixed');
  const entries = await readdir(fixedDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')))
    .map((entry) => path.join(fixedDir, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const questions: Question[] = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    questions.push(...parseYamlQuestions(source, file));
  }

  return questions;
}
