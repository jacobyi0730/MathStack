---
id: T-017
title: 템플릿 엔진 & build:bank
phase: 3
status: done
agent: pipeline-engineer
skills: [build-bank]
depends: [T-016]
refs: ["기획서 §12.7", "기획서 §15.3"]
---

# T-017 · 템플릿 엔진 & `build:bank`

## 목표

파라미터 템플릿을 전개해 학년별 정적 JSON을 굽는다. **템플릿 1개가 60개 변형을 만든다.**

## 범위

- [ ] `tools/template.ts` — `Template` 정의와 전개 엔진
- [ ] `tools/build-bank.ts` — `content/templates/` + `content/fixed/` → `public/data/bank-gN.json`
- [ ] `tools/rng.ts` — 시드 기반 PRNG (mulberry32 등)
- [ ] `tools/math.ts` — 오개념 오답 생성 헬퍼 (`misalignAdd`, `noCarryAdd`, `denominatorAdd` …)
- [ ] `tests/tools/template.test.ts`

## 템플릿 형태

```ts
defineTemplate({
  standard: '4수01-15',
  grade: 4, semester: 2,
  domain: Domain.Number,
  unit: '분수의 덧셈과 뺄셈',
  difficulty: 2,
  misconceptionTag: 'fraction_denominator_add',
  stem: ({ a, b, d }) => `${a}/${d} + ${b}/${d} 는 얼마인가요?`,
  params: (rng) => genFractionPair(rng, { minDen: 5, maxDen: 12, improper: true }),
  answer: (p) => frac(p.a + p.b, p.d),
  distractors: [
    ['분모끼리도 더함',     (p) => frac(p.a + p.b, p.d * 2)],
    ['분자를 뺌',           (p) => frac(Math.abs(p.a - p.b), p.d)],
    ['분모·분자 모두 더함', (p) => frac(p.a + p.b + 1, p.d)],
  ],
});
```

## 정확 연산 — 타협 없음

**분수는 `fraction.js`, 소수는 `decimal.js`로 계산한다.** 부동소수점 산술 금지.

```ts
3.42 + 1.8                       // 5.220000000000001  ← 이 값이 정답으로 구워진다
new Decimal(3.42).plus(1.8)      // 5.22               ← 이렇게 쓴다
```

float로 계산하면 오답이 오개념이 아니라 **IEEE 754 때문에** 틀린 값이 되고, §12.2의 설계 전체가 무너진다. 이 두 라이브러리는 `devDependencies`이며 `src/`에서 import 하지 않는다.

## 결정성 — 이 태스크의 핵심 제약

**같은 입력이 같은 뱅크를 만들어야 한다.** 아니면 회귀 테스트가 불가능하다.

- 시드 기반 PRNG를 인자로 넘긴다. **`Math.random()` 절대 금지** — 전역 상태라 재현이 안 된다
- 시드는 `hash(standard) + variantIndex`처럼 결정적으로 만든다
- 시드를 문항 ID의 변형 번호에 반영한다 (`G4-N-015-03`)

## 전개 규칙

- 템플릿당 **60변형**. 학년별 JSON을 예산 안에 유지한다
- 전개 중 **정답이 오답과 겹치면 그 변형을 버리고 다시 뽑는다** (최대 20회 재시도 후 실패 보고)
- 선택지 순서는 굽는 시점에 셔플하지 않는다. **출제 시 클라이언트가 셔플**한다

## 완료 조건 (DoD)

- [ ] `npm run build:bank`이 `public/data/bank-g3~g6.json`을 산출한다
- [ ] 두 번 구운 결과의 **해시가 동일**하다
- [ ] 템플릿 1개가 60개 변형을 만든다
- [ ] 정답과 오답이 겹치는 변형이 산출물에 없다
- [ ] 코드베이스에 `Math.random()`이 없다
- [ ] 산출물이 `shared/schema.ts`의 `parse()`를 통과한다
- [ ] `npm run typecheck` · `npm run lint` · `npm run test` 통과

## 주의

파라미터 생성기에 제약을 안 걸면 이상한 문항이 나온다 — 분모 1인 분수, 0을 더하는 문제, 결과가 학년 범위를 벗어나는 값. **전개 후 변형 5개를 눈으로 읽는다.**

## 결과

- 구현: `tools/template.ts`, `tools/build-bank.ts`, `tools/rng.ts`, `tools/math.ts`, `tools/fixed.ts`, `tests/tools/template.test.ts`, `content/templates/*`, `content/fixed/fixed-questions.yaml`
- 검증: `npm run build:bank`, `npm run validate:bank`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` 통과
- 메모: 현재 `content/fixed` 파서는 이번 라운드에 필요한 단순 YAML만 지원한다. 실제 문항 저작량 확대 시 포맷 확장 여부를 T-019에서 다시 판단
