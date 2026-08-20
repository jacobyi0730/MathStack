import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRADE_SELECTION,
  normalizeGradeSelection,
  termIncludesSemester,
} from '../../src/ui/grade-select.js';

describe('grade select', () => {
  it('normalizes_invalid_selection_to_defaults', () => {
    expect(normalizeGradeSelection({ grade: 9, term: 'summer' as never })).toEqual(
      DEFAULT_GRADE_SELECTION,
    );
  });

  it('keeps_valid_grade_and_term', () => {
    expect(normalizeGradeSelection({ grade: 6, term: 'all' })).toEqual({
      grade: 6,
      term: 'all',
    });
  });

  it('maps_term_options_to_semester_scope', () => {
    expect(termIncludesSemester(1, 1)).toBe(true);
    expect(termIncludesSemester(1, 2)).toBe(false);
    expect(termIncludesSemester(2, 1)).toBe(true);
    expect(termIncludesSemester(2, 2)).toBe(true);
    expect(termIncludesSemester('all', 1)).toBe(true);
    expect(termIncludesSemester('all', 2)).toBe(true);
  });
});
