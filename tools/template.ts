import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Difficulty, Domain, Grade, Semester } from '../shared/domain.js';
import { QuestionSchema, type Question } from '../shared/schema.js';
import { CONTENT_DIR } from './paths.js';
import { renderValue, type ExactValue } from './math.js';
import { createRng, hashString, type Rng } from './rng.js';

export interface TemplateContext<Params> {
  params: Params;
  variantIndex: number;
}

export type ChoiceFactory<Params> = (params: Params) => ExactValue;

export type DistractorDefinition<Params> = readonly [reason: string, choice: ChoiceFactory<Params>];

export interface TemplateDefinition<Params> {
  key?: string;
  standard: string;
  grade: Grade;
  semester: Semester;
  domain: Domain;
  unit: string;
  difficulty: Difficulty;
  misconceptionTag: string;
  format?: Question['format'];
  timeLimitSec?: number;
  variantCount?: number;
  params: (rng: Rng) => Params;
  validateParams?: (params: Params) => boolean;
  stem: (params: Params) => string;
  answer: (params: Params) => ExactValue;
  distractors: readonly DistractorDefinition<Params>[];
  explanation: (ctx: TemplateContext<Params>) => string;
}

export function defineTemplate<Params>(definition: TemplateDefinition<Params>): TemplateDefinition<Params> {
  return definition;
}

function domainId(domain: Domain): 'N' | 'R' | 'G' | 'D' {
  switch (domain) {
    case '수와 연산':
      return 'N';
    case '변화와 관계':
      return 'R';
    case '도형과 측정':
      return 'G';
    case '자료와 가능성':
      return 'D';
  }
}

function standardSerial(standard: string): string {
  const pieces = standard.split('-');
  if (pieces.length !== 2) {
    throw new Error(`성취기준 형식이 아닙니다: ${standard}`);
  }
  return pieces[1];
}

function variantId(grade: Grade, domain: Domain, standard: string, variantIndex: number): string {
  const variant = String(variantIndex + 1).padStart(2, '0');
  return `G${grade}-${domainId(domain)}-${standardSerial(standard)}-${variant}`;
}

function templateSeed<Params>(definition: TemplateDefinition<Params>, variantIndex: number): number {
  const key = definition.key ?? definition.standard;
  return hashString(`${definition.grade}:${definition.standard}:${key}:${variantIndex}`);
}

function fingerprint(question: Omit<Question, 'id'>): string {
  return JSON.stringify([
    question.standard,
    question.stem,
    question.choices,
    question.answer,
    question.explanation,
  ]);
}

export function expandTemplate<Params>(
  definition: TemplateDefinition<Params>,
  defaultCount = 60,
  maxRetries = 20,
): Question[] {
  const questions: Question[] = [];
  const seen = new Set<string>();
  const variantCount = definition.variantCount ?? defaultCount;

  for (let variantIndex = 0; variantIndex < variantCount; variantIndex += 1) {
    let built: Question | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const seed = templateSeed(definition, variantIndex * maxRetries + attempt);
      const rng = createRng(seed);
      const params = definition.params(rng);

      if (definition.validateParams && !definition.validateParams(params)) {
        continue;
      }

      const answer = renderValue(definition.answer(params));
      const choices = [answer];
      const reasons = ['정답'];

      for (const [reason, distractorFactory] of definition.distractors) {
        choices.push(renderValue(distractorFactory(params)));
        reasons.push(reason);
      }

      if (new Set(choices).size !== choices.length) {
        continue;
      }

      const candidateWithoutId: Omit<Question, 'id'> = {
        grade: definition.grade,
        semester: definition.semester,
        domain: definition.domain,
        unit: definition.unit,
        standard: definition.standard,
        difficulty: definition.difficulty,
        format: definition.format ?? 'choice',
        stem: definition.stem(params),
        choices,
        answer,
        distractorReason: reasons,
        explanation: definition.explanation({ params, variantIndex }),
        timeLimitSec: definition.timeLimitSec ?? 15,
        misconceptionTag: definition.misconceptionTag,
      };

      const key = fingerprint(candidateWithoutId);
      if (seen.has(key)) {
        continue;
      }

      const candidate = QuestionSchema.parse({
        id: variantId(definition.grade, definition.domain, definition.standard, variantIndex),
        ...candidateWithoutId,
      });

      seen.add(key);
      built = candidate;
      break;
    }

    if (!built) {
      throw new Error(
        `${definition.standard} 템플릿의 ${variantIndex + 1}번째 변형을 ${maxRetries}회 안에 생성하지 못했습니다.`,
      );
    }

    questions.push(built);
  }

  return questions;
}

type TemplateModule = {
  default?: TemplateDefinition<unknown> | TemplateDefinition<unknown>[];
  templates?: TemplateDefinition<unknown>[];
};

function normalizeModule(module: TemplateModule, file: string): TemplateDefinition<unknown>[] {
  if (Array.isArray(module.default)) return module.default;
  if (module.default) return [module.default];
  if (Array.isArray(module.templates)) return module.templates;
  throw new Error(`템플릿 모듈 형식을 알 수 없습니다: ${file}`);
}

export async function loadTemplates(): Promise<TemplateDefinition<unknown>[]> {
  const templateDir = path.join(CONTENT_DIR, 'templates');
  const entries = await readdir(templateDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => path.join(templateDir, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const templates: TemplateDefinition<unknown>[] = [];
  for (const file of files) {
    const module = (await import(pathToFileURL(file).href)) as TemplateModule;
    templates.push(...normalizeModule(module, file));
  }

  return templates;
}
