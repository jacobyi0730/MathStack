import { describe, expect, it } from 'vitest';
import { tokenizeFractions } from '../../src/ui/fraction.js';

describe('fraction ui', () => {
  it('tokenizes_simple_fractions_without_exposing_slash_text_as_fraction_tokens', () => {
    expect(tokenizeFractions('3/5만큼 이동')).toEqual([
      {
        kind: 'fraction',
        numerator: '3',
        denominator: '5',
        source: '3/5',
      },
      { kind: 'text', value: '만큼 이동' },
    ]);
  });

  it('tokenizes_improper_and_mixed_fractions', () => {
    expect(tokenizeFractions('7/4는 1과 3/4보다 큽니다')).toEqual([
      {
        kind: 'fraction',
        numerator: '7',
        denominator: '4',
        source: '7/4',
      },
      { kind: 'text', value: '는 ' },
      {
        kind: 'fraction',
        whole: '1',
        numerator: '3',
        denominator: '4',
        source: '1과 3/4',
      },
      { kind: 'text', value: '보다 큽니다' },
    ]);
  });
});
