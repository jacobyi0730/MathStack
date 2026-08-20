# TodoList

> **완료 상태의 유일한 정본이다.** 어떤 태스크가 끝났는지, 지금 누가 무엇을 잡고 있는지는 여기서만 본다.
> 구조(선행 관계·담당 에이전트·사용 스킬)는 [Tasks/README.md](Tasks/README.md), 상세는 각 태스크 파일.

## 규칙

| 표시 | 뜻 | 누가 바꾸나 |
| --- | --- | --- |
| `[ ]` | 착수 가능 | — |
| `[~]` | **누군가 잡고 있다.** 건드리지 마라 | 오케스트레이터가 배정할 때 |
| `[x]` | 완료 | `task-close` 스킬 |
| `[-]` | 선행 미완 | — |

**병렬 작업 규칙**

1. **`[~]` 는 잠금이다.** 다른 에이전트가 그 태스크의 파일을 건드리면 충돌한다.
2. **동시에 돌릴 태스크는 파일 집합이 겹치지 않아야 한다.** 배정 전에 각 태스크의 산출 경로를 대조한다.
3. **작업 에이전트는 이 파일을 수정하지 않는다.** 상태 갱신은 오케스트레이터가 한다 — 여러 에이전트가 같은 줄을 고치면 그 자체가 충돌이다.
4. 끝난 태스크를 다시 잡지 않는다. **착수 전 반드시 여기를 먼저 읽는다.**

---

## Phase 0 — 기반

- [x] **T-001** 프로젝트 스캐폴딩 — `deploy-ops` ✅ 2026-08-20
- [x] **T-002** Netlify 배포 파이프라인 — `deploy-ops` ✅ 2026-08-20
- [x] **T-003** 게임 루프 & 고정 타임스텝 — `game-engine-dev` ✅ 2026-08-20
- [x] **T-005** 오브젝트 풀 & 공간 해시 — `game-engine-dev` ✅ 2026-08-20
- [~] **T-004** 렌더러 & 캐릭터 스프라이트 — `game-engine-dev` 🔒 claude/game-engine-dev

## Phase 1 — 게임 코어

- [-] **T-006** 플레이어 이동 & 입력 — `game-engine-dev` · 선행 T-004
- [-] **T-007** 적 스폰 & 추격 AI — `game-engine-dev` · 선행 T-005 ✅, T-006
- [-] **T-008** 충돌 판정 & 데미지 — `game-engine-dev` · 선행 T-005 ✅, T-007
- [-] **T-009** 경험치 & 레벨업 — `game-engine-dev` · 선행 T-008
- [-] **T-010** 무기 시스템 기반 + 1종 — `game-engine-dev` · 선행 T-008

## Phase 2 — 전투 확장

- [-] **T-011** 무기 8종 — `game-engine-dev` · 선행 T-010
- [-] **T-012** 패시브 8종 — `game-engine-dev` · 선행 T-010
- [-] **T-013** 각성 시스템 — `game-engine-dev` · 선행 T-011, T-012
- [-] **T-014** 적 에이전트 7종 — `game-engine-dev` · 선행 T-007
- [-] **T-015** 보스 3종 & 웨이브 타임라인 — `game-engine-dev` · 선행 T-014

## Phase 3 — 수학 시스템

- [~] **T-016** 공유 스키마 & 커리큘럼 테이블 — `pipeline-engineer` 🔒 codex
- [-] **T-017** 템플릿 엔진 & `build:bank` — `pipeline-engineer` · 선행 T-016
- [-] **T-018** 뱅크 검증기 `validate:bank` — `pipeline-engineer` · 선행 T-016
- [-] **T-019** 학년별 문항 저작 — `quiz-author` · 선행 T-017, T-018
- [-] **T-020** 클라이언트 출제기 — `game-engine-dev` · 선행 T-009, T-019
- [-] **T-021** 퀴즈 모달 UI — `ui-builder` · 선행 T-020
- [-] **T-022** 오답 큐 & 오개념 복습 — `game-engine-dev` · 선행 T-020, T-021

## Phase 4 — 세션 & 운영

- [-] **T-023** 인게임 HUD — `ui-builder` · 선행 T-009, T-010
- [-] **T-024** 타이틀 & 학년/캐릭터 선택 — `ui-builder` · 선행 T-019
- [-] **T-025** 초월 수련 — `game-engine-dev` · 선행 T-015, T-022
- [-] **T-026** 결과 화면 & localStorage — `ui-builder` · 선행 T-022, T-023
- [-] **T-027** 접근성 옵션 — `ui-builder` · 선행 T-021, T-023
- [-] **T-028** 성능 튜닝 & 스트레스 모드 — `game-engine-dev` · 선행 T-015

---

## 현황

**4 / 28 완료** · 진행 중 2 (T-004 claude · T-016 codex) · 착수 가능 0

## 병렬 배정 이력

| 시각 | 태스크 | 실행자 | 파일 집합 | 결과 |
| --- | --- | --- | --- | --- |
| 08-20 17:4x | **T-004** 렌더러·캐릭터 | Claude `game-engine-dev` | `src/engine/renderer·camera`, `src/entities/sprite`, `src/data/palette`, `src/main`, `tests/src/` | 진행 중 |
| 08-20 17:4x | **T-016** 스키마·커리큘럼 | **codex** | `shared/curriculum·schema·domain`, `tests/tools/` | 진행 중 |

> 두 집합은 **완전히 분리돼 있다.** 트랙 A(`src/`)와 트랙 B(`shared/`+`tests/tools/`)는 겹치는 파일이 하나도 없다.
> 공통으로 읽기만 하는 것: `AGENTS.md`, `docs/`, `Tasks/T-*.md`.
