---
title: MathStack 작업 보드
status: stable
owner: 기획
updated: 2026-08-20
related: [MathStack기획서]
---

# 작업 보드

기획서([docs/MathStack기획서.md](../docs/MathStack기획서.md))를 **기능 단위 28개 태스크**로 분해한 것이다.
계층 구조와 라우팅 규칙은 [AGENTS.md §5](../AGENTS.md#5-오케스트레이션)에 있다.

## 읽는 법

- **상태** — `todo` 착수 가능 · `doing` 진행 중 · `blocked` 선행 미완 · `done` 완료
- **선행** — 이 태스크를 시작하려면 먼저 `done`이어야 하는 태스크
- 태스크를 끝낼 때는 반드시 **`task-close` 스킬**을 거친다. DoD 확인·보드 동기화·후속 해제가 한 세트다.

## Phase 0 — 기반 (M0)

> 목표: **검은 화면이라도 Netlify URL이 열린다.** 배포 파이프라인을 맨 앞에 둔다. 마지막에 붙이면 반드시 터진다.

| ID | 태스크 | 담당 | 스킬 | 선행 | 상태 |
| --- | --- | --- | --- | --- | --- |
| [T-001](T-001-프로젝트-스캐폴딩.md) | 프로젝트 스캐폴딩 | deploy-ops | — | — | `done` ✅ |
| [T-002](T-002-netlify-배포-파이프라인.md) | Netlify 배포 파이프라인 | deploy-ops | build-bank | T-001 | `doing` ⏳ |
| [T-003](T-003-게임-루프.md) | 게임 루프 & 고정 타임스텝 | game-engine-dev | perf-check | T-001 | `todo` |
| [T-004](T-004-렌더러-캐릭터.md) | 렌더러 & 캐릭터 스프라이트 | game-engine-dev | — | T-003 | `blocked` |
| [T-005](T-005-오브젝트풀-공간해시.md) | 오브젝트 풀 & 공간 해시 | game-engine-dev | perf-check | T-003 | `blocked` |

## Phase 1 — 게임 코어 (M1)

> 목표: **문제 시스템 없이 3분간 플레이가 재미있는가.** 수학을 붙이기 전에 게임이 재미없으면, 붙인 뒤에도 재미없다.

| ID | 태스크 | 담당 | 스킬 | 선행 | 상태 |
| --- | --- | --- | --- | --- | --- |
| [T-006](T-006-플레이어-이동-입력.md) | 플레이어 이동 & 입력 | game-engine-dev | — | T-004 | `blocked` |
| [T-007](T-007-적-스폰-추격AI.md) | 적 스폰 & 추격 AI | game-engine-dev | add-enemy, perf-check | T-005, T-006 | `blocked` |
| [T-008](T-008-충돌-데미지.md) | 충돌 판정 & 데미지 | game-engine-dev | perf-check | T-005, T-007 | `blocked` |
| [T-009](T-009-경험치-레벨업.md) | 경험치 & 레벨업 | game-engine-dev | — | T-008 | `blocked` |
| [T-010](T-010-무기-시스템-기반.md) | 무기 시스템 기반 + 1종 | game-engine-dev | add-weapon | T-008 | `blocked` |

## Phase 2 — 전투 확장 (M2)

> 목표: **빌드 분기가 체감되는가.** 같은 캐릭터로 두 판을 돌렸을 때 다른 게임처럼 느껴져야 한다.

| ID | 태스크 | 담당 | 스킬 | 선행 | 상태 |
| --- | --- | --- | --- | --- | --- |
| [T-011](T-011-무기-8종.md) | 무기 8종 | game-engine-dev | add-weapon | T-010 | `blocked` |
| [T-012](T-012-패시브-8종.md) | 패시브 8종 | game-engine-dev | add-weapon | T-010 | `blocked` |
| [T-013](T-013-각성-시스템.md) | 각성(진화) 시스템 | game-engine-dev | add-weapon | T-011, T-012 | `blocked` |
| [T-014](T-014-적-에이전트-7종.md) | 적 에이전트 7종 | game-engine-dev | add-enemy, perf-check | T-007 | `blocked` |
| [T-015](T-015-보스-웨이브-타임라인.md) | 보스 3종 & 웨이브 타임라인 | game-engine-dev | add-enemy | T-014 | `blocked` |

## Phase 3 — 수학 시스템 (M3~M4)

> 목표: **학년별 문항이 성취기준에 실제로 대응하는가.** 이 게임의 존재 이유다.

| ID | 태스크 | 담당 | 스킬 | 선행 | 상태 |
| --- | --- | --- | --- | --- | --- |
| [T-016](T-016-문항-스키마.md) | 공유 스키마 & 커리큘럼 테이블 | pipeline-engineer | — | T-001 | `todo` |
| [T-017](T-017-템플릿엔진-build-bank.md) | 템플릿 엔진 & `build:bank` | pipeline-engineer | build-bank | T-016 | `blocked` |
| [T-018](T-018-뱅크-검증기.md) | 뱅크 검증기 `validate:bank` | pipeline-engineer | build-bank, verify-curriculum | T-016 | `blocked` |
| [T-019](T-019-학년별-문항-저작.md) | 학년별 문항 저작 (3~6) | quiz-author | add-question-template, verify-curriculum | T-017, T-018 | `blocked` |
| [T-020](T-020-클라이언트-출제기.md) | 클라이언트 출제기 | game-engine-dev | — | T-009, T-019 | `blocked` |
| [T-021](T-021-퀴즈-모달-UI.md) | 퀴즈 모달 UI | ui-builder | — | T-020 | `blocked` |
| [T-022](T-022-오답큐-오개념-복습.md) | 오답 큐 & 오개념 복습 | game-engine-dev | — | T-020, T-021 | `blocked` |

## Phase 4 — 세션 & 운영 (M5~M6)

> 목표: **10분 완주가 가능하고, 적 300체에서 60FPS를 유지한다.**

| ID | 태스크 | 담당 | 스킬 | 선행 | 상태 |
| --- | --- | --- | --- | --- | --- |
| [T-023](T-023-HUD.md) | 인게임 HUD | ui-builder | — | T-009, T-010 | `blocked` |
| [T-024](T-024-타이틀-학년선택.md) | 타이틀 & 학년/캐릭터 선택 | ui-builder | — | T-019 | `blocked` |
| [T-025](T-025-초월-수련.md) | 초월 수련 (8~9분 구간) | game-engine-dev | — | T-015, T-022 | `blocked` |
| [T-026](T-026-결과화면-localstorage.md) | 결과 화면 & localStorage | ui-builder | — | T-022, T-023 | `blocked` |
| [T-027](T-027-접근성-옵션.md) | 접근성 옵션 | ui-builder | — | T-021, T-023 | `blocked` |
| [T-028](T-028-성능-튜닝.md) | 성능 튜닝 & 스트레스 모드 | game-engine-dev | perf-check | T-015 | `blocked` |

## 범위 밖

| 항목 | 사유 |
| --- | --- |
| 학급 코드 랭킹 (M7) | 정적 배포에 서버가 없다. 기획서 §15.6에서 방안 택일 후 착수 |
| 골드 상점 메타 프로그레션 | 기획서 §18 #1에서 v1 제외 권장 |
| 사운드 | 기획서 §18 #4 미결정 |

## 진행 현황

| Phase | 전체 | done | doing | todo/blocked |
| --- | --- | --- | --- | --- |
| 0 | 5 | 1 | 1 | 3 |
| 1 | 5 | 0 | 0 | 5 |
| 2 | 5 | 0 | 0 | 5 |
| 3 | 7 | 0 | 0 | 7 |
| 4 | 6 | 0 | 0 | 6 |
| **합계** | **28** | **1** | **1** | **26** |
