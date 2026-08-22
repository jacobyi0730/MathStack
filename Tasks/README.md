---
title: MathStack 작업 보드
status: stable
owner: 기획
updated: 2026-08-21
related: [MathStack기획서]
---

# 작업 보드

기획서([docs/MathStack기획서.md](../docs/MathStack기획서.md))를 **기능 단위 45개 태스크**로 분해한 것이다.
이 문서는 **구조**를 담는다 — 무엇이 무엇에 걸려 있고, 누가 맡고, 어떤 스킬을 쓰는지.

> **완료 상태는 여기 없다.** 끝났는지·누가 잡고 있는지는 [TodoList.md](../TodoList.md)가 유일한 정본이다.
> 상태를 두 곳에 두면 반드시 어긋난다.

계층 구조와 라우팅 규칙은 [AGENTS.md §5](../AGENTS.md#5-오케스트레이션)에 있다.
태스크를 끝낼 때는 반드시 **`task-close` 스킬**을 거친다.

## Phase 0 — 기반 (M0)

> 목표: **검은 화면이라도 Netlify URL이 열린다.** 배포 파이프라인을 맨 앞에 둔다. 마지막에 붙이면 반드시 터진다.

| ID | 태스크 | 담당 | 스킬 | 선행 |
| --- | --- | --- | --- | --- |
| [T-001](T-001-프로젝트-스캐폴딩.md) | 프로젝트 스캐폴딩 | deploy-ops | — | — |
| [T-002](T-002-netlify-배포-파이프라인.md) | Netlify 배포 파이프라인 | deploy-ops | build-bank | T-001 |
| [T-003](T-003-게임-루프.md) | 게임 루프 & 고정 타임스텝 | game-engine-dev | perf-check | T-001 |
| [T-004](T-004-렌더러-캐릭터.md) | 렌더러 & 캐릭터 스프라이트 | game-engine-dev | — | T-003 |
| [T-005](T-005-오브젝트풀-공간해시.md) | 오브젝트 풀 & 공간 해시 | game-engine-dev | perf-check | T-003 |

## Phase 1 — 게임 코어 (M1)

> 목표: **문제 시스템 없이 3분간 플레이가 재미있는가.** 수학을 붙이기 전에 게임이 재미없으면, 붙인 뒤에도 재미없다.

| ID | 태스크 | 담당 | 스킬 | 선행 |
| --- | --- | --- | --- | --- |
| [T-006](T-006-플레이어-이동-입력.md) | 플레이어 이동 & 입력 | game-engine-dev | — | T-004 |
| [T-007](T-007-적-스폰-추격AI.md) | 적 스폰 & 추격 AI | game-engine-dev | add-enemy, perf-check | T-005, T-006 |
| [T-008](T-008-충돌-데미지.md) | 충돌 판정 & 데미지 | game-engine-dev | perf-check | T-005, T-007 |
| [T-009](T-009-경험치-레벨업.md) | 경험치 & 레벨업 | game-engine-dev | — | T-008 |
| [T-010](T-010-무기-시스템-기반.md) | 무기 시스템 기반 + 1종 | game-engine-dev | add-weapon | T-008 |

## Phase 2 — 전투 확장 (M2)

> 목표: **빌드 분기가 체감되는가.** 같은 캐릭터로 두 판을 돌렸을 때 다른 게임처럼 느껴져야 한다.

| ID | 태스크 | 담당 | 스킬 | 선행 |
| --- | --- | --- | --- | --- |
| [T-011](T-011-무기-8종.md) | 무기 8종 | game-engine-dev | add-weapon | T-010 |
| [T-012](T-012-패시브-8종.md) | 패시브 8종 | game-engine-dev | add-weapon | T-010 |
| [T-013](T-013-각성-시스템.md) | 각성(진화) 시스템 | game-engine-dev | add-weapon | T-011, T-012 |
| [T-014](T-014-적-에이전트-7종.md) | 적 에이전트 7종 | game-engine-dev | add-enemy, perf-check | T-007 |
| [T-015](T-015-보스-웨이브-타임라인.md) | 보스 3종 & 웨이브 타임라인 | game-engine-dev | add-enemy | T-014 |

## Phase 3 — 수학 시스템 (M3~M4)

> 목표: **학년별 문항이 성취기준에 실제로 대응하는가.** 이 게임의 존재 이유다.

| ID | 태스크 | 담당 | 스킬 | 선행 |
| --- | --- | --- | --- | --- |
| [T-016](T-016-문항-스키마.md) | 공유 스키마 & 커리큘럼 테이블 | pipeline-engineer | — | T-001 |
| [T-017](T-017-템플릿엔진-build-bank.md) | 템플릿 엔진 & `build:bank` | pipeline-engineer | build-bank | T-016 |
| [T-018](T-018-뱅크-검증기.md) | 뱅크 검증기 `validate:bank` | pipeline-engineer | build-bank, verify-curriculum | T-016 |
| [T-019](T-019-학년별-문항-저작.md) | 학년별 문항 저작 (3~6) | quiz-author | add-question-template, verify-curriculum | T-017, T-018 |
| [T-020](T-020-클라이언트-출제기.md) | 클라이언트 출제기 | game-engine-dev | — | T-009, T-019 |
| [T-021](T-021-퀴즈-모달-UI.md) | 퀴즈 모달 UI | ui-builder | — | T-020 |
| [T-022](T-022-오답큐-오개념-복습.md) | 오답 큐 & 오개념 복습 | game-engine-dev | — | T-020, T-021 |

## Phase 4 — 세션 & 운영 (M5~M6)

> 목표: **10분 완주가 가능하고, 적 300체에서 60FPS를 유지한다.**

| ID | 태스크 | 담당 | 스킬 | 선행 |
| --- | --- | --- | --- | --- |
| [T-023](T-023-HUD.md) | 인게임 HUD | ui-builder | — | T-009, T-010 |
| [T-024](T-024-타이틀-학년선택.md) | 타이틀 & 학년/캐릭터 선택 | ui-builder | — | T-019 |
| [T-025](T-025-초월-수련.md) | 초월 수련 (8~9분 구간) | game-engine-dev | — | T-015, T-022 |
| [T-026](T-026-결과화면-localstorage.md) | 결과 화면 & localStorage | ui-builder | — | T-022, T-023 |
| [T-027](T-027-접근성-옵션.md) | 접근성 옵션 | ui-builder | — | T-021, T-023 |
| [T-028](T-028-성능-튜닝.md) | 성능 튜닝 & 스트레스 모드 | game-engine-dev | perf-check | T-015 |
| [T-029](T-029-월드래핑-스킬선택-버그수정.md) | 월드 래핑 & 스킬 선택 버그 수정 | game-engine-dev | — | T-009, T-011, T-012, T-013, T-021 |
| [T-030](T-030-전투피드백-스킬설명-초반밸런스.md) | 전투 피드백 · 스킬 설명 · 초반 밸런스 | game-engine-dev | — | T-010, T-011, T-012, T-023, T-029 |
| [T-031](T-031-기획문서-분리-기록지침.md) | 기획 문서 분리 & 기록 지침 | doc-keeper | new-doc | T-030 |
| [T-032](T-032-기획서-허브화.md) | MathStack기획서 허브화 | doc-keeper | — | T-031 |
| [T-033](T-033-기획서-상세이관-보정.md) | 기획서 상세 이관 보정 | doc-keeper | — | T-032 |
| [T-034](T-034-근접무기-접촉피해-퀴즈시간제한.md) | 근접 무기 범위·접촉 피해·퀴즈 시간 제한 | game-engine-dev | — | T-033 |
| [T-035](T-035-경험치드롭-원소램프-즉시아이템.md) | 경험치 드롭·원소 램프·즉시 발동 아이템 | game-engine-dev | perf-check | T-034 |
| [T-036](T-036-퀴즈-보기-가독성.md) | 퀴즈 보기 가독성 | ui-builder | — | T-035 |
| [T-037](T-037-엔티티-모양-아이콘.md) | 엔티티 모양 체계와 아이콘 | game-engine-dev | perf-check | T-036 |
| [T-038](T-038-드롭산포-램프색-아이콘가독성.md) | 드롭 산포·램프 단일색·아이콘 가독성 | game-engine-dev | — | T-037 |
| [T-039](T-039-mds7-플레이테스트-개선.md) | mds/7 플레이 테스트 개선 | game-engine-dev | perf-check | T-038 |
| [T-040](T-040-mds8-작업2-개선.md) | mds/8 작업2 개선 | game-engine-dev | build-bank | T-039 |
| [T-041](T-041-mds9-시작무기-선택-보정.md) | mds/9 시작 무기 선택 보정 | game-engine-dev | task-close | T-040 |
| [T-042](T-042-mds10-각성짝꿍-조건-설명.md) | mds/10 각성 짝꿍 설명과 조건 보정 | game-engine-dev | task-close | T-041 |
| [T-043](T-043-mds11-아이템-보상몬스터-UI-밸런스.md) | mds/11 아이템·보상 몬스터·UI·밸런스 보정 | game-engine-dev | task-close | T-042 |
| [T-044](T-044-mds12-넵투늄-밸런스-재조정.md) | mds/12 넵투늄 밸런스 재조정 | balance-tuner | task-close | T-043 |
| [T-045](T-045-mds13-보상선택지-빌드맞춤.md) | mds/13 보상 선택지 빌드 맞춤 | game-engine-dev | task-close | T-044 |
| [T-046](T-046-mds14-8분-보스-이어하기-랭킹.md) | mds/14 8분·보스·이어하기·랭킹 개선 | game-engine-dev | task-close | T-045 |
| [T-047](T-047-mds15-이름별-랭킹.md) | mds/15 이름별 랭킹 개선 | game-engine-dev | task-close | T-046 |
| [T-048](T-048-모바일-터치-이동.md) | 모바일 터치 이동 최적화 | game-engine-dev | task-close | T-047 |
| [T-049](T-049-모바일-모달-잘림-보정.md) | 모바일 퀴즈·스킬 선택 잘림 보정 | ui-builder | task-close | T-048 |
| [T-050](T-050-보상몬스터-자석-밸런스.md) | 보상 몬스터·자석 밸런스 | balance-tuner | task-close | T-049 |
| [T-051](T-051-퀴즈-출제-랜덤성.md) | 퀴즈 출제 랜덤성 보정 | game-engine-dev | task-close | T-050 |
| [T-052](T-052-모바일-메뉴-잘림-보정.md) | 모바일 메뉴 잘림 보정 | ui-builder | task-close | T-051 |

## 병렬 트랙

의존 그래프상 **세 갈래가 거의 독립적으로 흐른다.** 파일 집합이 겹치지 않아 동시에 진행할 수 있다.

| 트랙 | 태스크 흐름 | 주로 건드리는 곳 |
| --- | --- | --- |
| **A. 게임 코어** | T-004 → T-006 → T-007 → T-008 → T-009 → T-010 → T-011~T-015 | `src/engine`, `src/systems`, `src/entities`, `src/data` |
| **B. 수학 파이프라인** | T-016 → (T-017 ∥ T-018) → T-019 | `shared/`, `tools/`, `content/` |
| **C. UI** | T-021·T-023·T-024·T-026·T-027 | `src/ui/`, CSS |

트랙 A와 B는 **처음부터 끝까지 파일이 겹치지 않는다.** 트랙 C는 A·B의 산출물을 기다리므로 나중에 합류한다.
합류 지점은 **T-020(출제기)** — 트랙 B의 뱅크와 트랙 A의 레벨업이 여기서 만난다.

## 범위 밖

| 항목 | 사유 |
| --- | --- |
| 학급 코드 랭킹 (M7) | 정적 배포에 서버가 없다. 기획서 §15.6에서 방안 택일 후 착수 |
| 골드 상점 메타 프로그레션 | 기획서 §18 #1에서 v1 제외 권장 |
| 사운드 | 기획서 §18 #4 미결정 |
