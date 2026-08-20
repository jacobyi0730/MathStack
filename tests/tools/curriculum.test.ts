import { describe, expect, it } from 'vitest';
import { DOMAINS, GRADES, STANDARD_PATTERN, bandOf } from '../../shared/domain.js';
import {
  CURRICULUM,
  EXCLUDED_STANDARDS,
  isExcluded,
  lookupStandard,
  standardsFor,
} from '../../shared/curriculum.js';

describe('CURRICULUM', () => {
  it('학년별_코드_개수가_0이_아니다', () => {
    for (const grade of GRADES) {
      expect(standardsFor(grade).length).toBeGreaterThan(0);
    }
  });

  it('모든_코드가_STANDARD_PATTERN을_만족한다', () => {
    for (const code of Object.keys(CURRICULUM)) {
      expect(STANDARD_PATTERN.test(code)).toBe(true);
    }
  });

  it('grade와_코드_학년군_접두가_전부_일치한다', () => {
    for (const [code, info] of Object.entries(CURRICULUM)) {
      expect(code.startsWith(`${bandOf(info.grade)}수`)).toBe(true);
    }
  });

  it('중복_코드가_없다', () => {
    const codes = Object.keys(CURRICULUM);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('4개_영역이_모두_등장한다', () => {
    const domains = new Set(Object.values(CURRICULUM).map((info) => info.domain));
    expect(domains.size).toBe(DOMAINS.length);
    for (const domain of DOMAINS) {
      expect(domains.has(domain)).toBe(true);
    }
  });

  it('출제_제외_코드는_모두_✕로_표시돼_있다', () => {
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
