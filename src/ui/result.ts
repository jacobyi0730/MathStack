import type { TimelineResultKind } from '../systems/timeline.js';
import type { HudSlotState } from './hud.js';
import {
  describeMisconception,
  type QuizStatsSummary,
} from '../quiz/stats.js';
import type { MathStackStorageData } from '../storage.js';

export interface ResultScreenSummary {
  readonly result: Exclude<TimelineResultKind, 'none'>;
  readonly survivalSec: number;
  readonly score: number;
  readonly kills: number;
  readonly level: number;
  readonly weapons: readonly HudSlotState[];
  readonly passives: readonly HudSlotState[];
  readonly evolutions: readonly HudSlotState[];
  readonly quiz: QuizStatsSummary;
  readonly storage: MathStackStorageData;
}

export interface ResultScreenHandlers {
  readonly onRetry?: () => void;
  readonly onChangeGrade?: () => void;
}

export interface ResultScreen {
  readonly element: HTMLElement;
  show(summary: ResultScreenSummary): void;
  hide(): void;
  destroy(): void;
}

export function createResultScreen(
  parent: HTMLElement = document.body,
  handlers: ResultScreenHandlers = {},
): ResultScreen {
  const root = parent.ownerDocument.createElement('section');
  root.className = 'mathstack-result';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.style.cssText = rootStyle();
  parent.appendChild(root);

  return {
    element: root,

    show(summary: ResultScreenSummary): void {
      render(root, summary, handlers);
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
  summary: ResultScreenSummary,
  handlers: ResultScreenHandlers,
): void {
  const doc = root.ownerDocument;
  const panel = doc.createElement('div');
  panel.style.cssText = panelStyle();

  const title = doc.createElement('h1');
  title.textContent = resultTitle(summary.result);
  title.style.cssText = 'margin:0;font-size:36px;color:#ffffff;';
  panel.appendChild(title);

  const stats = doc.createElement('div');
  stats.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px;';
  appendStat(stats, '생존', formatTime(summary.survivalSec));
  appendStat(stats, '점수', `${summary.score}`);
  appendStat(stats, '처치', `${summary.kills}`);
  appendStat(stats, '레벨', `${summary.level}`);
  appendStat(stats, '정답률', formatPercent(summary.quiz.accuracy));
  panel.appendChild(stats);

  panel.appendChild(section(doc, '전투 기록', [
    `무기 ${formatSlots(summary.weapons)}`,
    `패시브 ${formatSlots(summary.passives)}`,
    `각성 ${formatSlots(summary.evolutions)}`,
  ]));

  const domainLines = summary.quiz.byDomain.map(
    (item) => `${item.domain}: ${formatPercent(item.accuracy)} (${item.firstTryCorrect}/${item.attempted})`,
  );
  panel.appendChild(section(doc, '학습 기록', [
    `푼 문항 ${summary.quiz.attempted}`,
    `1차 정답 ${summary.quiz.firstTryCorrect}`,
    `오개념 전환율 ${formatPercent(summary.quiz.reviewConversionRate)}`,
    ...domainLines,
  ]));

  const misconceptionLines =
    summary.quiz.frequentMisconceptions.length === 0
      ? ['자주 틀린 오개념 없음']
      : summary.quiz.frequentMisconceptions.map(
          (item) => `${describeMisconception(item.tag)}: 오답 ${item.wrong}, 복습 성공 ${item.converted}`,
        );
  panel.appendChild(section(doc, '다음에 볼 것', misconceptionLines));

  panel.appendChild(section(doc, '개인 최고', [
    `점수 ${summary.storage.best.score}`,
    `생존 ${formatTime(summary.storage.best.survivalSec)}`,
    `처치 ${summary.storage.best.kills}`,
    `정답률 ${formatPercent(summary.storage.best.accuracy)}`,
  ]));

  panel.appendChild(section(doc, '랭킹 TOP 5', formatRankings(summary)));

  const actions = doc.createElement('div');
  actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;';
  actions.append(
    button(doc, '다시 하기', () => handlers.onRetry?.()),
    button(doc, '학년 바꾸기', () => handlers.onChangeGrade?.()),
  );
  panel.appendChild(actions);

  root.replaceChildren(panel);
}

function formatRankings(summary: ResultScreenSummary): string[] {
  if (summary.storage.rankings.length === 0) return ['아직 랭킹 없음'];
  return summary.storage.rankings.map(
    (entry, index) =>
      `${index + 1}. ${entry.heroName} · ${entry.score}점 · ${entry.grade}학년 · Lv.${entry.level} · 처치 ${entry.kills} · ${formatTime(entry.survivalSec)}`,
  );
}

function appendStat(parent: HTMLElement, label: string, value: string): void {
  const item = parent.ownerDocument.createElement('div');
  item.style.cssText = statStyle();
  const name = parent.ownerDocument.createElement('span');
  name.textContent = label;
  name.style.cssText = 'font-size:13px;color:#cbd5e1;font-weight:700;';
  const body = parent.ownerDocument.createElement('strong');
  body.textContent = value;
  body.style.cssText = 'font-size:22px;color:#ffffff;';
  item.append(name, body);
  parent.appendChild(item);
}

function section(doc: Document, title: string, lines: readonly string[]): HTMLElement {
  const wrap = doc.createElement('section');
  wrap.style.cssText = 'display:grid;gap:8px;';
  const heading = doc.createElement('h2');
  heading.textContent = title;
  heading.style.cssText = 'margin:0;font-size:20px;color:#ffffff;';
  const list = doc.createElement('ul');
  list.style.cssText = 'margin:0;padding-left:20px;color:#f8fafc;line-height:1.45;';
  for (const line of lines) {
    const item = doc.createElement('li');
    item.textContent = line;
    list.appendChild(item);
  }
  wrap.append(heading, list);
  return wrap;
}

function button(doc: Document, label: string, onClick: () => void): HTMLButtonElement {
  const el = doc.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.style.cssText = buttonStyle();
  el.addEventListener('click', onClick);
  return el;
}

function resultTitle(result: Exclude<TimelineResultKind, 'none'>): string {
  if (result === 'victory') return '안정화 성공';
  if (result === 'defeat') return '붕괴 저지 실패';
  return '시간 종료';
}

function formatSlots(slots: readonly HudSlotState[]): string {
  const labels = slots.filter((slot) => slot.id !== null).map((slot) => `${slot.label} Lv.${slot.level}`);
  return labels.length > 0 ? labels.join(', ') : '없음';
}

function formatTime(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function rootStyle(): string {
  return [
    'position:fixed',
    'inset:0',
    'z-index:40',
    'display:none',
    'place-items:start center',
    'padding:16px',
    'box-sizing:border-box',
    'overflow:auto',
    'overscroll-behavior:contain',
    'background:rgba(3,7,18,0.78)',
    'color:#ffffff',
    'font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
  ].join(';');
}

function panelStyle(): string {
  return [
    'display:grid',
    'gap:18px',
    'width:min(860px,100%)',
    'max-height:calc(100dvh - 32px)',
    'overflow:auto',
    'padding:24px',
    'box-sizing:border-box',
    'border-radius:8px',
    'background:#111827',
    'border:1px solid #334155',
  ].join(';');
}

function statStyle(): string {
  return [
    'display:grid',
    'gap:4px',
    'min-height:64px',
    'padding:12px',
    'box-sizing:border-box',
    'border-radius:8px',
    'background:#1f2937',
    'border:1px solid #475569',
  ].join(';');
}

function buttonStyle(): string {
  return [
    'min-height:56px',
    'padding:0 18px',
    'border:0',
    'border-radius:8px',
    'background:#ffc107',
    'color:#111827',
    'font-weight:800',
    'font-size:16px',
    'cursor:pointer',
  ].join(';');
}
