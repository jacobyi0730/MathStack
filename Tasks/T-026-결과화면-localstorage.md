---
id: T-026
title: 결과 화면 & localStorage
phase: 4
status: done
agent: ui-builder
skills: []
depends: [T-022, T-023]
refs: ["기획서 §4", "기획서 §15.2", "기획서 §17"]
---

# T-026 · 결과 화면 & localStorage

## 목표

세션 결과를 보여주고 기록을 남긴다. **서버가 없으므로 전부 `localStorage`다.**

## 결과 화면 항목

| 구분 | 표시 |
| --- | --- |
| 생존 | 생존 시간, 승리/패배 |
| 전투 | 처치 수, 최종 레벨, 획득 무기·패시브·각성 |
| 학습 | **정답률** (1차 정답 기준), 푼 문항 수 |
| 학습 | **영역별 정답률** — 수와 연산 / 변화와 관계 / 도형과 측정 / 자료와 가능성 |
| 학습 | **오개념 전환율** — 복습에서 맞힌 비율 |
| 학습 | 자주 틀린 오개념 상위 3개 (한국어 설명으로) |

**영역별 정답률과 오개념 목록이 이 화면의 핵심이다.** 아이와 교사에게 "무엇을 더 봐야 하는지"를 알려주는 유일한 지점이다.

## 범위

- [ ] `src/ui/result.ts` — 결과 화면
- [ ] `src/quiz/stats.ts` — 세션 통계 집계
- [ ] `src/storage.ts` — `localStorage` 읽기/쓰기 래퍼
- [ ] 개인 최고 기록 갱신 (생존 시간, 처치 수, 정답률)
- [ ] 오개념 이력 누적 — 판을 넘어 유지
- [ ] "다시 하기" / "학년 바꾸기" 버튼

## 저장 스키마

```jsonc
{
  "version": 1,
  "best": { "survivalSec": 600, "kills": 512, "accuracy": 0.82 },
  "lastChoice": { "grade": 4, "semester": 2, "character": "plus" },
  "misconceptions": { "decimal_alignment": { "wrong": 5, "converted": 3 } },
  "sessions": 12
}
```

**`version` 필드를 반드시 둔다.** 스키마가 바뀌었을 때 옛 데이터로 크래시나지 않게 마이그레이션 경로를 남긴다.

## 완료 조건 (DoD)

- [x] 승리·패배 양쪽에서 결과 화면이 뜬다
- [x] 영역별 정답률이 4개 영역 전부 표시된다
- [x] 오개념 전환율이 계산되어 표시된다
- [x] 자주 틀린 오개념이 **한국어 설명**으로 나온다 (태그 문자열 노출 금지)
- [x] 기록이 `localStorage`에 저장되고 다음 판에서 복원된다
- [x] 저장 데이터가 없거나 손상됐을 때 크래시하지 않는다
- [x] `npm run lint` · `npm run test` 통과

## 결과 메모

- `src/quiz/stats.ts`에 1차 정답률, 영역별 정답률, 오개념 전환율, 상위 오개념 집계를 추가했다.
- `src/storage.ts`에 `version: 1` 저장 스키마, 손상 데이터 복구, 개인 최고 기록과 오개념 누적 저장을 구현했다.
- `src/ui/result.ts`에 결과 화면과 다시 하기/학년 바꾸기 액션을 추가하고, 세션 종료 시 `main.ts`에서 표시·저장하도록 연결했다.
- 게이트: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build:bank`, `npm run validate:bank`, `npm run build` 통과.

## 주의

`localStorage`는 브라우저·기기별로 분리된다. 학교 공용 PC에서는 다른 아이의 기록이 보일 수 있다. **개인 식별 정보를 저장하지 않는다** — 용사 이름도 아이가 직접 입력한 별명일 뿐이며, 실명 입력을 유도하지 않는다.
