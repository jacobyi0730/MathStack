import { describe, expect, it } from 'vitest';
import { DOMAINS, GRADES, STANDARD_PATTERN, bandOf } from '../../shared/domain.js';
import {
  CURRICULUM,
  EXCLUDED_STANDARDS,
  isExcluded,
  isStandardForGrade,
  isStandardForSemester,
  lookupStandard,
  standardsFor,
} from '../../shared/curriculum.js';

describe('CURRICULUM', () => {
  it('has at least one standard for every grade', () => {
    for (const grade of GRADES) {
      expect(standardsFor(grade).length).toBeGreaterThan(0);
    }
  });

  it('keeps every code in the standard-code format', () => {
    for (const code of Object.keys(CURRICULUM)) {
      expect(STANDARD_PATTERN.test(code)).toBe(true);
    }
  });

  it('keeps every assigned grade inside the code band', () => {
    for (const [code, info] of Object.entries(CURRICULUM)) {
      expect(code.startsWith(`${bandOf(info.grade)}수`)).toBe(true);
      for (const grade of info.grades) {
        expect(code.startsWith(`${bandOf(grade)}수`)).toBe(true);
      }
    }
  });

  it('supports standards that appear in more than one grade plan', () => {
    const standard = lookupStandard('4수04-01');

    expect(standard).toBeDefined();
    expect(standard?.grades).toEqual([1, 2, 3, 4]);
    expect(isStandardForGrade(standard!, 3)).toBe(true);
    expect(isStandardForGrade(standard!, 4)).toBe(true);
    expect(isStandardForSemester(standard!, 3, 1)).toBe(false);
    expect(isStandardForSemester(standard!, 3, 2)).toBe(true);
    expect(isStandardForSemester(standard!, 4, 1)).toBe(true);
    expect(standardsFor(4, 1)).toContain('4수04-01');
  });

  it('allows third-grade equality relation questions from the shared 3-4 band', () => {
    const standard = lookupStandard('4수02-03');

    expect(standard).toBeDefined();
    expect(standard?.grades).toEqual([1, 2, 3, 4]);
    expect(isStandardForGrade(standard!, 3)).toBe(true);
    expect(isStandardForSemester(standard!, 3, 1)).toBe(true);
    expect(standardsFor(3, 1)).toContain('4수02-03');
  });

  it('has no duplicate codes', () => {
    const codes = Object.keys(CURRICULUM);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('keeps all four curriculum domains represented', () => {
    const domains = new Set(Object.values(CURRICULUM).map((info) => info.domain));
    expect(domains.size).toBe(DOMAINS.length);
    for (const domain of DOMAINS) {
      expect(domains.has(domain)).toBe(true);
    }
  });

  it('marks every excluded standard explicitly', () => {
    expect(EXCLUDED_STANDARDS).toEqual([
      '4수03-07',
      '4수04-03',
      '6수03-04',
      '6수03-06',
      '6수03-08',
      '6수04-03',
    ]);

    for (const code of EXCLUDED_STANDARDS) {
      expect(isExcluded(code)).toBe(true);
      expect(lookupStandard(code)?.fitness).toBe('✕');
    }
  });
});
