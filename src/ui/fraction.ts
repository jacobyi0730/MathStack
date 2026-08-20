export type FractionToken =
  | {
      kind: 'text';
      value: string;
    }
  | {
      kind: 'fraction';
      whole?: string;
      numerator: string;
      denominator: string;
      source: string;
    };

const MIXED_FRACTION_PATTERN = /(\d+)\s*(?:과|and)?\s+(\d+)\/(\d+)/y;
const SIMPLE_FRACTION_PATTERN = /(\d+)\/(\d+)/y;

export function tokenizeFractions(text: string): FractionToken[] {
  const tokens: FractionToken[] = [];
  let index = 0;
  let textStart = 0;

  while (index < text.length) {
    const mixed = matchAt(MIXED_FRACTION_PATTERN, text, index);
    const simple = mixed === undefined ? matchAt(SIMPLE_FRACTION_PATTERN, text, index) : undefined;

    if (mixed !== undefined || simple !== undefined) {
      const match = mixed ?? simple;
      if (match === undefined) break;

      if (textStart < index) {
        tokens.push({ kind: 'text', value: text.slice(textStart, index) });
      }

      if (mixed !== undefined) {
        tokens.push({
          kind: 'fraction',
          whole: mixed[1],
          numerator: mixed[2],
          denominator: mixed[3],
          source: mixed[0],
        });
      } else if (simple !== undefined) {
        tokens.push({
          kind: 'fraction',
          numerator: simple[1],
          denominator: simple[2],
          source: simple[0],
        });
      }

      index += match[0].length;
      textStart = index;
      continue;
    }

    index += 1;
  }

  if (textStart < text.length) {
    tokens.push({ kind: 'text', value: text.slice(textStart) });
  }

  return tokens;
}

export function renderMathText(text: string, doc: Document = document): DocumentFragment {
  const fragment = doc.createDocumentFragment();

  for (const token of tokenizeFractions(text)) {
    if (token.kind === 'text') {
      fragment.appendChild(doc.createTextNode(token.value));
      continue;
    }

    fragment.appendChild(renderFraction(token, doc));
  }

  return fragment;
}

export function renderFraction(token: Extract<FractionToken, { kind: 'fraction' }>, doc: Document): HTMLElement {
  const wrapper = doc.createElement('span');
  wrapper.className = 'mathstack-fraction';
  wrapper.setAttribute('aria-label', formatFractionLabel(token));
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '0.18em';
  wrapper.style.verticalAlign = 'middle';
  wrapper.style.lineHeight = '1';

  if (token.whole !== undefined) {
    const whole = doc.createElement('span');
    whole.className = 'mathstack-fraction__whole';
    whole.textContent = token.whole;
    wrapper.appendChild(whole);
  }

  const stack = doc.createElement('span');
  stack.className = 'mathstack-fraction__stack';
  stack.style.display = 'inline-grid';
  stack.style.gridTemplateRows = 'auto 1px auto';
  stack.style.justifyItems = 'center';
  stack.style.alignItems = 'center';
  stack.style.minWidth = '1.2em';

  const numerator = doc.createElement('span');
  numerator.className = 'mathstack-fraction__numerator';
  numerator.textContent = token.numerator;

  const bar = doc.createElement('span');
  bar.className = 'mathstack-fraction__bar';
  bar.setAttribute('aria-hidden', 'true');
  bar.style.width = '100%';
  bar.style.borderTop = '2px solid currentColor';

  const denominator = doc.createElement('span');
  denominator.className = 'mathstack-fraction__denominator';
  denominator.textContent = token.denominator;

  stack.append(numerator, bar, denominator);
  wrapper.appendChild(stack);

  return wrapper;
}

function matchAt(pattern: RegExp, text: string, index: number): RegExpExecArray | undefined {
  pattern.lastIndex = index;
  return pattern.exec(text) ?? undefined;
}

function formatFractionLabel(token: Extract<FractionToken, { kind: 'fraction' }>): string {
  const fraction = `${token.numerator} over ${token.denominator}`;
  return token.whole === undefined ? fraction : `${token.whole} and ${fraction}`;
}
