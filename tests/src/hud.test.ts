import { describe, expect, it } from 'vitest';
import {
  HUD_CLASS_NAMES,
  HUD_PASSIVE_SLOT_COUNT,
  HUD_UPDATE_EVERY_FRAMES,
  HUD_WEAPON_SLOT_COUNT,
  createHud,
  type HudState,
} from '../../src/ui/hud.js';

class FakeElement {
  readonly style = {} as CSSStyleDeclaration;
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  className = '';
  textContent = '';
  parent: FakeElement | null = null;

  constructor(
    readonly tagName: string,
    readonly ownerDocument: FakeDocument,
  ) {}

  appendChild(child: FakeElement): FakeElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  remove(): void {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
    this.parent = null;
  }
}

class FakeDocument {
  readonly body = new FakeElement('body', this);

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName, this);
  }
}

describe('hud', () => {
  it('hud_createHud_buildsTopAndBottomOverlaysOutsideCenter', () => {
    const doc = new FakeDocument();
    const hud = createHud(doc.body as unknown as HTMLElement);
    const root = asFake(hud.root);
    const top = asFake(hud.top);
    const bottom = asFake(hud.bottom);

    expect(doc.body.children).toEqual([root]);
    expect(root.className).toBe(HUD_CLASS_NAMES.root);
    expect(top.style.position).toBe('absolute');
    expect(top.style.top).toBe('0');
    expect(bottom.style.position).toBe('absolute');
    expect(bottom.style.bottom).toBe('0');
    expect(findByClass(root, HUD_CLASS_NAMES.slot)).toHaveLength(
      HUD_WEAPON_SLOT_COUNT + HUD_PASSIVE_SLOT_COUNT,
    );
  });

  it('hud_update_throttlesChangingValuesToTenFrames', () => {
    const doc = new FakeDocument();
    const hud = createHud(doc.body as unknown as HTMLElement);

    expect(hud.update(makeState({ frame: 0, elapsedSec: 1, xp: 1 }))).toBe(true);
    const firstText = collectText(asFake(hud.top));

    expect(
      hud.update(makeState({ frame: HUD_UPDATE_EVERY_FRAMES - 1, elapsedSec: 2, xp: 2 })),
    ).toBe(false);
    expect(collectText(asFake(hud.top))).toBe(firstText);

    expect(hud.update(makeState({ frame: HUD_UPDATE_EVERY_FRAMES, elapsedSec: 2, xp: 2 }))).toBe(
      true,
    );
    expect(collectText(asFake(hud.top))).toContain('0:02');
    expect(collectText(asFake(hud.top))).toContain('2/10');
  });

  it('hud_update_updatesSlotsImmediatelyAndMarksEvolutionReady', () => {
    const doc = new FakeDocument();
    const hud = createHud(doc.body as unknown as HTMLElement);
    const initial = makeState({ frame: 0, elapsedSec: 1 });
    hud.update(initial);

    const changed = hud.update({
      ...initial,
      frame: 1,
      weapons: [
        {
          id: 'hydrogen_arrow',
          label: 'Hydrogen Arrow',
          level: 5,
          element: 'H',
          evolutionReady: true,
        },
      ],
    });

    const readySlot = findByClass(asFake(hud.bottom), HUD_CLASS_NAMES.slotReady)[0] as FakeElement;
    expect(changed).toBe(true);
    expect(readySlot.textContent).toBe('Hydrogen Arrow Lv.5');
    expect(readySlot.getAttribute('aria-label')).toBe(
      'Weapon slot 1: Hydrogen Arrow, level 5, evolution ready',
    );
  });

  it('hud_destroy_removesRootFromParent', () => {
    const doc = new FakeDocument();
    const hud = createHud(doc.body as unknown as HTMLElement);

    hud.destroy();

    expect(doc.body.children).toHaveLength(0);
  });
});

function makeState(overrides: Partial<HudState>): HudState {
  return {
    frame: 0,
    elapsedSec: 0,
    chapter: 1,
    level: 1,
    xp: 0,
    xpRequired: 10,
    health: 70,
    maxHealth: 100,
    score: 0,
    kills: 3,
    quizCorrect: 2,
    quizTotal: 4,
    noticeText: '',
    weapons: [],
    passives: [],
    ...overrides,
  };
}

function asFake(element: HTMLElement): FakeElement {
  return element as unknown as FakeElement;
}

function findByClass(root: FakeElement, className: string): FakeElement[] {
  const matches: FakeElement[] = [];
  visit(root, (element) => {
    if (element.className.split(' ').includes(className)) matches.push(element);
  });
  return matches;
}

function collectText(root: FakeElement): string {
  let text = root.textContent;
  visit(root, (element) => {
    if (element !== root) text += element.textContent;
  });
  return text;
}

function visit(root: FakeElement, visitor: (element: FakeElement) => void): void {
  visitor(root);
  for (let i = 0; i < root.children.length; i += 1) {
    visit(root.children[i] as FakeElement, visitor);
  }
}
