import { BankSchema } from '../../shared/schema.js';
import type { Bank } from '../../shared/schema.js';
import type { Grade } from '../../shared/domain.js';

export function getBankPath(grade: Grade): string {
  return `/data/bank-g${grade}.json`;
}

export async function loadQuestionBank(grade: Grade): Promise<Bank> {
  const response = await fetch(getBankPath(grade));

  if (!response.ok) {
    throw new Error(`Failed to load question bank for grade ${grade}: ${response.status}`);
  }

  const data: unknown = await response.json();
  return BankSchema.parse(data);
}
