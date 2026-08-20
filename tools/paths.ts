import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** 저장소 루트. tools/ 의 한 단계 위 */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 생성물이 나가는 유일한 위치 (36-코딩컨벤션 §3) */
export const DATA_DIR = path.join(ROOT, 'public', 'data');

export const CONTENT_DIR = path.join(ROOT, 'content');

export function bankPath(grade: number): string {
  return path.join(DATA_DIR, `bank-g${grade}.json`);
}

export const BALANCE_PATH = path.join(DATA_DIR, 'balance.json');
