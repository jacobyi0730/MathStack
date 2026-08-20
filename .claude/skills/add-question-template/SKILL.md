---
name: add-question-template
description: 수학 문항 템플릿 또는 고정 문항을 오개념 기반 오답과 함께 추가한다. 새 성취기준을 커버하거나 기존 문항의 오답 설계를 고칠 때 사용한다.
---

# 문항 템플릿 추가

**이 프로젝트가 레퍼런스와 갈라지는 지점이다.** 오답 설계를 대충 하면 만들 이유가 없는 게임이 된다.

## 0단계 — 템플릿인가 고정 문항인가

| | 선택 |
| --- | --- |
| 숫자만 바꿔도 같은 개념을 묻는가 | **템플릿** (`content/templates/`) |
| 도형 그림·그래프·특정 상황이 필요한가 | **고정 문항** (`content/fixed/`) |

파라미터화가 가능하면 **항상 템플릿**을 택한다. 반복 노출을 막는 유일한 수단이다.

## 1단계 — 성취기준 확정

기획서 §13 매핑표에서 `standard` 코드를 찾는다. **추측하지 않는다.**

- §13.5 출제 제외 목록에 있으면 중단한다.
- `grade`와 코드의 학년군이 맞는지 확인한다 (`4수`=3~4학년, `6수`=5~6학년).
- 확신이 없으면 `verify-curriculum` 스킬을 먼저 쓴다.

## 2단계 — 오개념 먼저 설계 ★

정답보다 **오답을 먼저 쓴다.** 이 문항을 틀리는 아이는 무엇을 모르는가?

```
성취기준: 4수01-16 소수 두 자리 수의 덧셈
정답:     3.42 + 1.8 = 5.22
오개념 1: 소수점을 안 맞추고 끝자리 정렬  → 3.60   [decimal_alignment]
오개념 2: 받아올림 누락                   → 5.20   [borrow_omission]
오개념 3: 소수 첫째 자리만 더함            → 4.22   [partial_add]
```

규칙:
- 오답 3개는 **서로 다른 오개념**이어야 한다.
- 무작위 숫자·정답±1 금지.
- 각 오답이 **실제로 계산해서 나올 수 있는 값**이어야 한다.

## 3단계 — 템플릿 작성

```ts
// content/templates/g4-decimal-add.ts
import { Domain } from '@shared/domain';
import { defineTemplate } from '@tools/template';
import { dec, misalignAdd, noCarryAdd, firstDecimalOnly } from '@tools/math';

export default defineTemplate({
  standard: '4수01-16',
  grade: 4, semester: 2,
  domain: Domain.Number,
  unit: '소수의 덧셈과 뺄셈',
  difficulty: 2,
  misconceptionTag: 'decimal_alignment',
  stem: ({ a, b }) => `${a} + ${b} 는 얼마인가요?`,
  params: (rng) => genDecimals(rng, { digits: 2, requireCarry: true }),
  answer: (p) => dec(p.a).plus(p.b),
  distractors: [
    ['소수점을 맞추지 않고 끝자리를 정렬해 더함', (p) => misalignAdd(p.a, p.b)],
    ['받아올림 누락',                            (p) => noCarryAdd(p.a, p.b)],
    ['소수 첫째 자리만 더함',                     (p) => firstDecimalOnly(p.a, p.b)],
  ],
  explanation: '소수점의 위치를 맞춰 세로로 쓰고 더합니다.',
  timeLimitSec: 15,
});
```

**정답은 `dec()`(decimal.js) 또는 `frac()`(fraction.js)으로 계산한다.** 부동소수점으로 `3.42 + 1.8`을 더하면 `5.220000000000001`이 정답으로 구워진다. 오답이 오개념이 아니라 IEEE 754 때문에 틀린 값이 되면, 이 스킬이 존재하는 이유가 사라진다.

**`rng`는 인자로 받는다. `Math.random()`을 쓰지 않는다** — 전개가 결정적이어야 회귀 테스트가 성립한다.

**파라미터 생성기는 반드시 제약을 보장한다.** 예: 받아올림이 있는 경우만 뽑기, 오답이 정답과 겹치지 않기, 결과가 학년 범위를 벗어나지 않기.

## 4단계 — 굽고 검증

```powershell
npm run build:bank
npm run validate:bank
npm run test
```

검증기가 잡는 것: 성취기준 실재, 학년 정합성, 오개념 태그 누락, 오답 근거 개수, **정답 유일성**, 선택지 중복, 출제 제외 코드, 영역 비중.

## 5단계 — 눈으로 확인

전개된 변형 5개를 실제로 읽는다. 파라미터 생성기가 이상한 문항을 만드는 경우가 흔하다 — 분모가 1인 분수, 0을 더하는 문제, 소수점 아래가 사라지는 값.

## 완료 조건

- [ ] `standard`가 §13 매핑표에 실재하고 학년이 맞다
- [ ] 오답 3개가 서로 다른 오개념이고 계산으로 도달 가능하다
- [ ] `distractorReason`과 `misconceptionTag`가 채워졌다
- [ ] 해설이 **다음에 맞힐 수 있게** 방법을 알려준다
- [ ] `validate:bank` 통과
- [ ] 전개 변형 5개를 눈으로 읽고 이상 없음을 확인했다
