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
- [x] **T-004** 렌더러 & 캐릭터 스프라이트 — `game-engine-dev` ✅ 2026-08-20 (codex) ⚠ 500개 렌더 실측은 T-028 이월

## Phase 1 — 게임 코어

- [x] **T-006** 플레이어 이동 & 입력 — `game-engine-dev` ✅ 2026-08-20 ⚠ 캐릭터 선택은 `?character=` 임시 노출
- [x] **T-007** 적 스폰 & 추격 AI — `game-engine-dev` ✅ 2026-08-20 ⚠ 렌더+투사체 포함 실측은 T-028
- [x] **T-008** 충돌 판정 & 데미지 — `game-engine-dev` ✅ 2026-08-20
- [x] **T-009** 경험치 & 레벨업 — `game-engine-dev` ✅ 2026-08-20
- [x] **T-010** 무기 시스템 기반 + 1종 — `game-engine-dev` ✅ 2026-08-20

## Phase 2 — 전투 확장

- [ ] **T-011** 무기 8종 — `game-engine-dev` · 선행 T-010 ✅
- [ ] **T-012** 패시브 8종 — `game-engine-dev` · 선행 T-010 ✅
- [-] **T-013** 각성 시스템 — `game-engine-dev` · 선행 T-011, T-012
- [x] **T-014** 적 에이전트 7종 — `game-engine-dev` ✅ 2026-08-20
- [x] **T-015** 보스 3종 & 웨이브 타임라인 — `game-engine-dev` ✅ 2026-08-20

## Phase 3 — 수학 시스템

- [x] **T-016** 공유 스키마 & 커리큘럼 테이블 — `pipeline-engineer` ✅ 2026-08-20 (codex) ⚠ 1:1 배치 결함 → T-018 전 수정 필요
- [x] **T-017** 템플릿 엔진 & `build:bank` — `pipeline-engineer` ✅ 2026-08-20
- [x] **T-018** 뱅크 검증기 `validate:bank` — `pipeline-engineer` ✅ 2026-08-20
- [x] **T-019** 학년별 문항 저작 — `quiz-author` ✅ 2026-08-20 ⚠ 표본 품질 검수·시각 문항 polish 후속
- [ ] **T-020** 클라이언트 출제기 — `game-engine-dev` · 선행 T-009 ✅, T-019 ✅
- [-] **T-021** 퀴즈 모달 UI — `ui-builder` · 선행 T-020
- [-] **T-022** 오답 큐 & 오개념 복습 — `game-engine-dev` · 선행 T-020, T-021

## Phase 4 — 세션 & 운영

- [ ] **T-023** 인게임 HUD — `ui-builder` · 선행 T-009 ✅, T-010 ✅
- [ ] **T-024** 타이틀 & 학년/캐릭터 선택 — `ui-builder` · 선행 T-019 ✅
- [-] **T-025** 초월 수련 — `game-engine-dev` · 선행 T-015, T-022
- [-] **T-026** 결과 화면 & localStorage — `ui-builder` · 선행 T-022, T-023
- [-] **T-027** 접근성 옵션 — `ui-builder` · 선행 T-021, T-023
- [ ] **T-028** 성능 튜닝 & 스트레스 모드 — `game-engine-dev` · 선행 T-015 ✅

---

## 현황

**16 / 28 완료** · 진행 중 0 · 착수 가능 6 (T-011, T-012, T-020, T-023, T-024, T-028)

## 병렬 배정 이력

| 시각 | 태스크 | 실행자 | 파일 집합 | 결과 |
| --- | --- | --- | --- | --- |
| 08-20 17:34 | **T-016** 스키마·커리큘럼 | **codex** | `shared/`, `tests/tools/` | ✅ 게이트 통과 (test 48→59). 경계 준수 |
| 08-20 17:39 | **T-004** 렌더러·캐릭터 | **codex** | `src/engine`, `src/entities`, `src/data`, `src/main`, `tests/src/` | ✅ 게이트 통과 (test 59→66). 경계 준수 |
| 08-20 18:03 | **T-006** 플레이어 이동·입력 | **game-engine-dev 서브에이전트** | `src/engine`, `src/entities`, `src/systems`, `src/data`, `src/main`, `tests/src/` | ✅ 게이트 통과 (test 66→80). 경계 준수 |
| 08-20 18:03 | **T-017** 템플릿 엔진·뱅크 빌드 | **pipeline-engineer 서브에이전트** | `tools/`, `content/`, `tests/tools/` | ✅ 게이트 통과 (`build:bank`, `validate:bank`, `build`). 결정성 확인 |
| 08-20 18:27 | **T-007** 적 스폰·추격 AI | **game-engine-dev 서브에이전트** | `src/entities`, `src/systems`, `src/data`, `src/engine`, `src/main`, `tests/src/`, `docs/30-기술/34-성능예산.md` | ✅ 게이트 통과 (test 80→104). 헤드리스 300체 p99 0.0105ms |
| 08-20 18:27 | **T-018** 뱅크 검증기 | **pipeline-engineer 서브에이전트** | `tools/`, `shared/`, `tests/tools/` | ✅ 12개 검사 구현. 콘텐츠 보강 후 `validate:bank` 통과 |
| 08-20 18:27 | **T-019** 학년별 문항 저작 | **quiz-author 서브에이전트 + 오케스트레이터 보정** | `content/`, `docs/MathStack기획서.md`, `shared/curriculum.ts` | ✅ 4개 학년 각 721문항. 영역·난이도 검증 통과 |
| 08-20 20:10 | **T-008** 충돌 판정·데미지 | **game-engine-dev 서브에이전트 + 오케스트레이터 보정** | `src/systems/collision.ts`, `src/systems/damage.ts`, `src/engine/state.ts`, `src/entities/player.ts`, `src/main.ts`, `tests/src/` | ✅ 게이트 통과 (test 104→120). 적 처치 보상 경로 통합 보정 |
| 08-20 20:10 | **T-014** 적 에이전트 7종 | **game-engine-dev 서브에이전트** | `src/data/enemies.ts`, `src/data/waves.ts`, `src/entities/enemy.ts`, `src/systems/enemy-ai.ts`, `src/systems/spawn.ts`, `tests/src/` | ✅ 게이트 통과. 300체 혼합 AI p99 0.0193ms |
| 08-20 20:22 | **T-009** 경험치·레벨업 | **game-engine-dev 서브에이전트 + 오케스트레이터 통합** | `src/data/level.ts`, `src/entities/pickup.ts`, `src/systems/pickup.ts`, `src/systems/level.ts`, `src/engine/state.ts`, `src/main.ts`, `tests/src/` | ✅ 게이트 통과. 레벨업 이벤트 큐와 픽업 풀 런타임 연결 |
| 08-20 20:22 | **T-010** 무기 기반·수소 화살 | **game-engine-dev 서브에이전트 + 오케스트레이터 통합** | `src/data/weapons.ts`, `src/entities/projectile.ts`, `src/systems/weapons.ts`, `src/engine/state.ts`, `src/main.ts`, `tests/src/` | ✅ 게이트 통과 (test 120→153). 기본 자동 공격·보스 피격 연결 |
| 08-20 20:22 | **T-015** 보스·타임라인 | **game-engine-dev 서브에이전트 + 오케스트레이터 통합** | `src/data/bosses.ts`, `src/entities/boss.ts`, `src/systems/timeline.ts`, `src/engine/state.ts`, `src/main.ts`, `tests/src/` | ✅ 게이트 통과. 보스 패턴 300프레임 max 0.4005ms |

> 두 집합은 **완전히 분리돼 있었다.** 트랙 A(`src/`)와 트랙 B(`shared/`+`tests/tools/`)는 겹치는 파일이 하나도 없었고, 두 실행자 모두 상대 디렉터리를 침범하지 않았다.

### 이 라운드에서 배운 것

| 문제 | 원인 | 대응 |
| --- | --- | --- |
| 첫 codex 실행이 아무것도 안 만듦 | `nohup ... &` 로 띄워 호출 종료 시 같이 죽음 | 하네스 백그라운드 실행을 쓴다 |
| **codex 2개 동시 실행 시 하나가 즉시 죽음** | codex CLI 가 동시 인스턴스를 못 버팀 | **한 번에 하나만.** 병렬이 필요하면 순차로 |
| 작업 중단 후에도 프로세스가 살아남음 | `TaskStop` 은 하네스 추적만 끊음 | `Stop-Process -Id <PID> -Force` 로 실제 종료 |
| 실행 중 출력이 0바이트로 보임 | `\| tail -N` 이 파이프가 닫혀야 출력 | 생존 확인은 `Get-Process codex` 로 |

전부 [AGENTS.md §5.4](AGENTS.md#54-실행자-선택--claude-에이전트-vs-codex)에 기록했다.
