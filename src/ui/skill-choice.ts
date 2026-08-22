import type { LevelRewardChoice } from '../systems/level-reward.js';

export interface SkillChoiceView {
  readonly element: HTMLElement;
  show(choices: readonly LevelRewardChoice[]): void;
  hide(): void;
  destroy(): void;
}

export interface SkillChoiceOptions {
  readonly onChoose?: (choice: LevelRewardChoice) => void;
}

export function createSkillChoiceView(
  parent: HTMLElement = document.body,
  options: SkillChoiceOptions = {},
): SkillChoiceView {
  const root = parent.ownerDocument.createElement('section');
  root.className = 'mathstack-skill-choice';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', '스킬 선택');
  root.style.cssText = rootStyle();
  parent.appendChild(root);

  return {
    element: root,
    show(choices: readonly LevelRewardChoice[]): void {
      render(root, choices, options);
      root.hidden = false;
      root.style.display = 'grid';
    },
    hide(): void {
      root.hidden = true;
      root.style.display = 'none';
    },
    destroy(): void {
      root.remove();
    },
  };
}

function render(
  root: HTMLElement,
  choices: readonly LevelRewardChoice[],
  options: SkillChoiceOptions,
): void {
  const doc = root.ownerDocument;
  const panel = doc.createElement('div');
  panel.style.cssText = panelStyle();

  const title = doc.createElement('h2');
  title.textContent = '스킬 선택';
  title.style.cssText = 'margin:0;font-size:28px;color:#ffffff;';
  panel.appendChild(title);

  const grid = doc.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;';
  for (const choice of choices) {
    grid.appendChild(createChoiceButton(doc, choice, options));
  }
  panel.appendChild(grid);
  root.replaceChildren(panel);
}

function createChoiceButton(
  doc: Document,
  choice: LevelRewardChoice,
  options: SkillChoiceOptions,
): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.style.cssText = buttonStyle();
  button.addEventListener('click', () => options.onChoose?.(choice));

  const kind = doc.createElement('span');
  kind.textContent = choice.kind === 'evolution' ? '각성' : choice.kind === 'weapon' ? '무기' : '보조무기';
  kind.style.cssText = 'font-size:13px;font-weight:800;color:#ffc107;';

  const name = doc.createElement('strong');
  name.textContent = choice.name;
  name.style.cssText = 'font-size:20px;color:#ffffff;';

  const detail = doc.createElement('span');
  detail.textContent = choice.detail;
  detail.style.cssText = 'font-size:14px;color:#dbe4ff;line-height:1.35;';

  const pair = doc.createElement('span');
  pair.textContent = choice.evolutionPairDetail ?? '';
  pair.style.cssText = 'font-size:13px;color:#b7f7d4;line-height:1.35;';

  const level = doc.createElement('span');
  level.textContent = choice.kind === 'evolution' ? '즉시 각성' : `Lv.${choice.levelAfter}`;
  level.style.cssText = 'font-size:15px;font-weight:800;color:#ffffff;';

  button.append(kind, name, detail);
  if (choice.evolutionPairDetail) button.appendChild(pair);
  button.appendChild(level);
  return button;
}

function rootStyle(): string {
  return [
    'position:fixed',
    'inset:0',
    'z-index:30',
    'display:none',
    'place-items:center',
    'padding:16px',
    'box-sizing:border-box',
    'overflow:auto',
    'overscroll-behavior:contain',
    'background:rgba(3,7,18,0.72)',
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
  ].join(';');
}

function panelStyle(): string {
  return [
    'display:grid',
    'gap:16px',
    'width:min(760px,100%)',
    'max-height:calc(100dvh - 32px)',
    'overflow:auto',
    'padding:24px',
    'box-sizing:border-box',
    'border-radius:8px',
    'background:#111827',
    'border:1px solid #334155',
  ].join(';');
}

function buttonStyle(): string {
  return [
    'display:grid',
    'gap:8px',
    'min-height:148px',
    'padding:16px',
    'text-align:left',
    'border-radius:8px',
    'border:2px solid #526179',
    'background:#1f2937',
    'color:#ffffff',
    'cursor:pointer',
  ].join(';');
}
