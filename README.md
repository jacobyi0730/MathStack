# MathStack

초등학교 3~6학년을 위한 **10분짜리 뱀서라이크 수학 게임**.
움직이기만 하면 자동으로 싸우고, 레벨업할 때마다 내 학년 교육과정에서 나온 수학 문제를 풀어 다음 힘을 고른다.

무기와 적의 이름은 **화학 원소**에서 가져오되, 원자번호가 그 대상의 수학적 성격과 맞는 원소만 쓴다.
탄소(6)는 완전수라서 회전체가 되고, 붕소(5)는 원자번호대로 5발을 쏜다.

## 실행경로
https://mathstack.netlify.app/

## 설치 · 실행

```bash
npm install
npm run dev            # http://localhost:5173
```

## 명령

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 산출물 미리보기 |
| `npm run build:bank` | 문항 뱅크 굽기 → `public/data/` |
| `npm run validate:bank` | 문항 검증 (실패 시 빌드 중단) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

문항이나 템플릿을 고쳤다면 `build:bank` → `validate:bank` 를 먼저 돌린다.

## 배포

Netlify 정적 배포. 런타임 서버가 없다.

```
npm ci && npm run build:bank && npm run validate:bank && npm run build
```

## 문서

**[AGENTS.md](AGENTS.md) 가 저장소의 진입점이다.** 절대 규칙과 전체 문서 인덱스가 거기 있다.

- [기획서](docs/MathStack기획서.md) — 전체 정본
- [31-아키텍처](docs/30-기술/31-아키텍처.md) — 구조와 경계
- [Tasks/README.md](Tasks/README.md) — 작업 보드

## 기술

TypeScript 단일 언어 · Canvas 2D · Vite · Zod · Vitest · Netlify
