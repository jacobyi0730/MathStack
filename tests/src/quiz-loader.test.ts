import { describe, expect, it, vi } from 'vitest';
import { Domain } from '../../shared/domain.js';
import { BANK_VERSION } from '../../shared/schema.js';
import { getBankPath, loadQuestionBank } from '../../src/quiz/loader.js';

describe('quiz loader', () => {
  it('uses_the_grade_bank_path', () => {
    expect(getBankPath(3)).toBe('/data/bank-g3.json');
    expect(getBankPath(6)).toBe('/data/bank-g6.json');
  });

  it('loads_and_validates_a_grade_bank', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          version: BANK_VERSION,
          grade: 3,
          questions: [
            {
              id: 'G3-N-001-01',
              grade: 3,
              semester: 1,
              domain: Domain.Number,
              unit: 'addition',
              standard: '4수01-03',
              difficulty: 1,
              format: 'choice',
              stem: '1 + 1 = ?',
              choices: ['2', '3', '4'],
              answer: '2',
              distractorReason: ['correct', 'plus one', 'plus two'],
              explanation: '1 + 1 = 2',
              timeLimitSec: 10,
              misconceptionTag: 'addition_counting',
            },
          ],
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const bank = await loadQuestionBank(3);

    expect(fetchMock).toHaveBeenCalledWith('/data/bank-g3.json');
    expect(bank.grade).toBe(3);
    expect(bank.questions).toHaveLength(1);
  });

  it('rejects_invalid_bank_json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: 999, grade: 3, questions: [] }),
      }),
    );

    await expect(loadQuestionBank(3)).rejects.toThrow();
  });
});
