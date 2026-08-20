export const HUD_UPDATE_EVERY_FRAMES = 10;
export const HUD_WEAPON_SLOT_COUNT = 6;
export const HUD_PASSIVE_SLOT_COUNT = 6;

export const HUD_CLASS_NAMES = {
  root: 'mathstack-hud',
  top: 'mathstack-hud__top',
  bottom: 'mathstack-hud__bottom',
  group: 'mathstack-hud__group',
  meter: 'mathstack-hud__meter',
  meterFill: 'mathstack-hud__meter-fill',
  slot: 'mathstack-hud__slot',
  slotReady: 'mathstack-hud__slot--evolution-ready',
  emptySlot: 'mathstack-hud__slot--empty',
} as const;

export interface HudSlotState {
  readonly id: string | null;
  readonly label: string;
  readonly level: number;
  readonly element: string;
  readonly evolutionReady?: boolean;
  readonly ariaLabel?: string;
}

export interface HudState {
  readonly frame: number;
  readonly elapsedSec: number;
  readonly level: number;
  readonly xp: number;
  readonly xpRequired: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly kills: number;
  readonly quizCorrect: number;
  readonly quizTotal: number;
  readonly weapons: readonly HudSlotState[];
  readonly passives: readonly HudSlotState[];
}

export interface Hud {
  readonly root: HTMLElement;
  readonly top: HTMLElement;
  readonly bottom: HTMLElement;
  update(state: HudState): boolean;
  forceUpdate(state: HudState): void;
  destroy(): void;
}

interface HudElements {
  readonly root: HTMLElement;
  readonly top: HTMLElement;
  readonly bottom: HTMLElement;
  readonly timeValue: HTMLElement;
  readonly levelValue: HTMLElement;
  readonly xpValue: HTMLElement;
  readonly xpFill: HTMLElement;
  readonly healthValue: HTMLElement;
  readonly healthFill: HTMLElement;
  readonly killsValue: HTMLElement;
  readonly quizValue: HTMLElement;
  readonly weaponSlots: HTMLElement[];
  readonly passiveSlots: HTMLElement[];
}

export function createHud(parent: HTMLElement = document.body): Hud {
  const doc = parent.ownerDocument;
  const elements = createHudElements(doc);
  parent.appendChild(elements.root);

  let lastFrame = Number.NEGATIVE_INFINITY;
  let lastValuesSignature = '';
  let lastWeaponSignature = '';
  let lastPassiveSignature = '';

  function applyState(state: HudState, force: boolean): boolean {
    const valuesSignature = getValuesSignature(state);
    const shouldUpdateValues =
      force ||
      (valuesSignature !== lastValuesSignature &&
        (lastFrame === Number.NEGATIVE_INFINITY ||
          state.frame - lastFrame >= HUD_UPDATE_EVERY_FRAMES));

    let changed = false;
    if (shouldUpdateValues) {
      updateValues(elements, state);
      lastValuesSignature = valuesSignature;
      lastFrame = state.frame;
      changed = true;
    }

    const weaponSignature = getSlotsSignature(state.weapons, HUD_WEAPON_SLOT_COUNT);
    if (force || weaponSignature !== lastWeaponSignature) {
      updateSlots(elements.weaponSlots, state.weapons, HUD_WEAPON_SLOT_COUNT, 'Weapon');
      lastWeaponSignature = weaponSignature;
      changed = true;
    }

    const passiveSignature = getSlotsSignature(state.passives, HUD_PASSIVE_SLOT_COUNT);
    if (force || passiveSignature !== lastPassiveSignature) {
      updateSlots(elements.passiveSlots, state.passives, HUD_PASSIVE_SLOT_COUNT, 'Passive');
      lastPassiveSignature = passiveSignature;
      changed = true;
    }

    return changed;
  }

  return {
    root: elements.root,
    top: elements.top,
    bottom: elements.bottom,

    update(state: HudState): boolean {
      return applyState(state, false);
    },

    forceUpdate(state: HudState): void {
      applyState(state, true);
    },

    destroy(): void {
      elements.root.remove();
    },
  };
}

function createHudElements(doc: Document): HudElements {
  const root = doc.createElement('section');
  root.className = HUD_CLASS_NAMES.root;
  root.setAttribute('aria-label', 'Game HUD');
  setRootStyle(root);

  const top = doc.createElement('div');
  top.className = HUD_CLASS_NAMES.top;
  setBarStyle(top, 'top');
  root.appendChild(top);

  const bottom = doc.createElement('div');
  bottom.className = HUD_CLASS_NAMES.bottom;
  setBarStyle(bottom, 'bottom');
  root.appendChild(bottom);

  const timeValue = appendStat(top, 'Time');
  const levelValue = appendStat(top, 'Lv');
  const xp = appendMeter(top, 'XP');
  const health = appendMeter(top, 'HP');
  const killsValue = appendStat(top, 'Kills');
  const quizValue = appendStat(top, 'Quiz');

  const weaponSlots = appendSlotGroup(bottom, 'Active', HUD_WEAPON_SLOT_COUNT);
  const passiveSlots = appendSlotGroup(bottom, 'Passive', HUD_PASSIVE_SLOT_COUNT);

  return {
    root,
    top,
    bottom,
    timeValue,
    levelValue,
    xpValue: xp.value,
    xpFill: xp.fill,
    healthValue: health.value,
    healthFill: health.fill,
    killsValue,
    quizValue,
    weaponSlots,
    passiveSlots,
  };
}

function appendStat(parent: HTMLElement, label: string): HTMLElement {
  const item = parent.ownerDocument.createElement('div');
  item.className = HUD_CLASS_NAMES.group;
  setGroupStyle(item);

  const labelEl = parent.ownerDocument.createElement('span');
  labelEl.textContent = label;
  setLabelStyle(labelEl);
  item.appendChild(labelEl);

  const value = parent.ownerDocument.createElement('strong');
  value.textContent = '-';
  setValueStyle(value);
  item.appendChild(value);
  parent.appendChild(item);
  return value;
}

function appendMeter(
  parent: HTMLElement,
  label: string,
): { value: HTMLElement; fill: HTMLElement } {
  const item = parent.ownerDocument.createElement('div');
  item.className = HUD_CLASS_NAMES.group;
  setGroupStyle(item);

  const row = parent.ownerDocument.createElement('div');
  row.style.display = 'flex';
  row.style.justifyContent = 'space-between';
  row.style.gap = '8px';
  item.appendChild(row);

  const labelEl = parent.ownerDocument.createElement('span');
  labelEl.textContent = label;
  setLabelStyle(labelEl);
  row.appendChild(labelEl);

  const value = parent.ownerDocument.createElement('strong');
  value.textContent = '-';
  setValueStyle(value);
  row.appendChild(value);

  const meter = parent.ownerDocument.createElement('div');
  meter.className = HUD_CLASS_NAMES.meter;
  setMeterStyle(meter);
  item.appendChild(meter);

  const fill = parent.ownerDocument.createElement('div');
  fill.className = HUD_CLASS_NAMES.meterFill;
  setMeterFillStyle(fill);
  meter.appendChild(fill);

  parent.appendChild(item);
  return { value, fill };
}

function appendSlotGroup(parent: HTMLElement, label: string, count: number): HTMLElement[] {
  const group = parent.ownerDocument.createElement('div');
  group.className = HUD_CLASS_NAMES.group;
  setSlotGroupStyle(group);

  const title = parent.ownerDocument.createElement('span');
  title.textContent = label;
  setLabelStyle(title);
  group.appendChild(title);

  const slots = new Array<HTMLElement>(count);
  for (let i = 0; i < count; i += 1) {
    const slot = parent.ownerDocument.createElement('div');
    slot.className = `${HUD_CLASS_NAMES.slot} ${HUD_CLASS_NAMES.emptySlot}`;
    slot.setAttribute('aria-label', `${label} slot ${i + 1} empty`);
    setSlotStyle(slot);
    group.appendChild(slot);
    slots[i] = slot;
  }

  parent.appendChild(group);
  return slots;
}

function updateValues(elements: HudElements, state: HudState): void {
  const xpRequired = Math.max(1, state.xpRequired);
  const maxHealth = Math.max(1, state.maxHealth);
  elements.timeValue.textContent = formatTime(state.elapsedSec);
  elements.levelValue.textContent = `${state.level}`;
  elements.xpValue.textContent = `${Math.max(0, Math.floor(state.xp))}/${Math.floor(xpRequired)}`;
  elements.xpFill.style.width = `${formatPercent(state.xp / xpRequired)}%`;
  elements.healthValue.textContent = `${Math.max(0, Math.ceil(state.health))}/${Math.ceil(maxHealth)}`;
  elements.healthFill.style.width = `${formatPercent(state.health / maxHealth)}%`;
  elements.killsValue.textContent = `${state.kills}`;
  elements.quizValue.textContent = `${state.quizCorrect}/${state.quizTotal}`;
}

function updateSlots(
  elements: HTMLElement[],
  slots: readonly HudSlotState[],
  count: number,
  label: string,
): void {
  for (let i = 0; i < count; i += 1) {
    const state = slots[i];
    const el = elements[i] as HTMLElement;
    if (!state || state.id === null) {
      el.textContent = '';
      el.className = `${HUD_CLASS_NAMES.slot} ${HUD_CLASS_NAMES.emptySlot}`;
      el.setAttribute('aria-label', `${label} slot ${i + 1} empty`);
      continue;
    }

    const levelText = state.level > 1 ? ` x${state.level}` : '';
    el.textContent = `${state.element}${levelText}`;
    el.className = state.evolutionReady
      ? `${HUD_CLASS_NAMES.slot} ${HUD_CLASS_NAMES.slotReady}`
      : HUD_CLASS_NAMES.slot;
    el.setAttribute('aria-label', state.ariaLabel ?? formatSlotAriaLabel(label, i, state));
  }
}

function getValuesSignature(state: HudState): string {
  return [
    Math.floor(state.elapsedSec),
    state.level,
    Math.floor(state.xp),
    state.xpRequired,
    Math.ceil(state.health),
    state.maxHealth,
    state.kills,
    state.quizCorrect,
    state.quizTotal,
  ].join('|');
}

function getSlotsSignature(slots: readonly HudSlotState[], count: number): string {
  let signature = '';
  for (let i = 0; i < count; i += 1) {
    const slot = slots[i];
    if (!slot || slot.id === null) {
      signature += 'empty;';
    } else {
      signature += `${slot.id}:${slot.level}:${slot.element}:${slot.evolutionReady === true};`;
    }
  }
  return signature;
}

function formatTime(elapsedSec: number): string {
  const total = Math.max(0, Math.floor(elapsedSec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatPercent(ratio: number): string {
  return `${Math.max(0, Math.min(100, Math.round(ratio * 100)))}`;
}

function formatSlotAriaLabel(label: string, index: number, state: HudSlotState): string {
  const ready = state.evolutionReady ? ', evolution ready' : '';
  return `${label} slot ${index + 1}: ${state.label}, level ${state.level}${ready}`;
}

function setRootStyle(el: HTMLElement): void {
  el.style.position = 'absolute';
  el.style.inset = '0';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '20';
  el.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  el.style.color = '#f8fafc';
}

function setBarStyle(el: HTMLElement, edge: 'top' | 'bottom'): void {
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.right = '0';
  el.style.display = 'flex';
  el.style.flexWrap = 'wrap';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.gap = '8px';
  el.style.padding = '8px 12px';
  el.style.background = 'rgba(15, 23, 42, 0.72)';
  el.style.backdropFilter = 'blur(4px)';
  if (edge === 'top') {
    el.style.top = '0';
  } else {
    el.style.bottom = '0';
  }
}

function setGroupStyle(el: HTMLElement): void {
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '6px';
  el.style.minHeight = '28px';
}

function setSlotGroupStyle(el: HTMLElement): void {
  setGroupStyle(el);
  el.style.flexWrap = 'wrap';
}

function setLabelStyle(el: HTMLElement): void {
  el.style.fontSize = '12px';
  el.style.fontWeight = '700';
  el.style.opacity = '0.82';
}

function setValueStyle(el: HTMLElement): void {
  el.style.fontSize = '14px';
  el.style.fontWeight = '800';
  el.style.minWidth = '2ch';
}

function setMeterStyle(el: HTMLElement): void {
  el.style.width = '86px';
  el.style.height = '6px';
  el.style.overflow = 'hidden';
  el.style.border = '1px solid rgba(248, 250, 252, 0.3)';
  el.style.background = 'rgba(15, 23, 42, 0.55)';
}

function setMeterFillStyle(el: HTMLElement): void {
  el.style.width = '0%';
  el.style.height = '100%';
  el.style.background = '#38bdf8';
}

function setSlotStyle(el: HTMLElement): void {
  el.style.width = '38px';
  el.style.height = '34px';
  el.style.display = 'grid';
  el.style.placeItems = 'center';
  el.style.border = '1px solid rgba(248, 250, 252, 0.35)';
  el.style.background = 'rgba(15, 23, 42, 0.68)';
  el.style.fontSize = '12px';
  el.style.fontWeight = '800';
}
