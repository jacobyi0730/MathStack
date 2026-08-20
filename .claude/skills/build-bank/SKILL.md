---
name: build-bank
description: 문항 뱅크를 굽고 검증한다. content/ 아래 템플릿이나 고정 문항을 고친 뒤, 또는 배포 전에 Netlify와 같은 순서로 빌드를 재현할 때 사용한다.
---

# 문항 뱅크 빌드

`content/`(원본) → `public/data/`(생성물) → `dist/`(배포물).

**`public/data/`와 `dist/`는 손으로 고치지 않는다.** 생성물이며 커밋하지 않는다.

## 표준 순서

```powershell
npm run build:bank        # 템플릿 전개 + 고정 문항 병합
npm run validate:bank     # 실패 시 exit 1
npm run build:balance     # 밸런스 문서 → balance.json
```

산출물:

| 파일 | 내용 |
| --- | --- |
| `public/data/bank-g3.json` ~ `bank-g6.json` | 학년별 문항 뱅크 |
| `public/data/balance.json` | 무기·적·성장곡선 수치 |

## 배포 전 전체 재현

Netlify 빌드와 **정확히 같은 순서**로 로컬에서 돌린다. 여기서 통과하지 못하면 배포도 실패한다.

```powershell
npm ci                # Netlify 에서는 자동 설치되므로 netlify.toml 에는 없다
npm run build:bank
npm run validate:bank
npm run build
npm run preview     # 산출물을 실제로 띄워 확인
```

## 검증 실패 대처

`validate:bank`는 **경고하지 않고 실패시킨다.** 메시지별 조치:

| 메시지 | 원인 | 조치 |
| --- | --- | --- |
| `unknown standard` | 매핑표에 없는 성취기준 | `verify-curriculum` 스킬로 확인 |
| `grade/standard mismatch` | 학년군 접두 불일치 | `grade` 또는 코드 수정 |
| `missing misconceptionTag` | 태그 누락 | 오개념 태그 지정 |
| `distractorReason length` | 근거 개수 ≠ 선택지 개수 | 근거 채우기 |
| `answer not unique` | 정답이 선택지에 없거나 중복 | 파라미터 생성기의 제약 확인 |
| `excluded standard` | §13.5 제외 코드 사용 | 문항 폐기 |
| `domain quota unmet` | 영역 문항 부족 | 부족 영역 문항 추가 |

**`answer not unique`가 가장 흔하다.** 파라미터 조합에 따라 오답이 우연히 정답과 같아지는 경우다. 생성기에 제약을 추가한다.

## 결정성 확인

같은 입력이 같은 뱅크를 만들어야 한다.

```powershell
npm run build:bank
Get-FileHash public/data/bank-g4.json | Select-Object -ExpandProperty Hash
npm run build:bank
Get-FileHash public/data/bank-g4.json | Select-Object -ExpandProperty Hash
```

두 해시가 다르면 시드 관리가 잘못된 것이다. **`Math.random()`을 쓰고 있지 않은지** 먼저 확인한다 — 전역 상태라 재현이 불가능하다. 시드 기반 PRNG를 인자로 넘기는 구조여야 한다.

```powershell
Select-String -Path "tools/*.ts","content/**/*.ts" -Pattern "Math\.random"   # 결과가 없어야 한다
```

## 번들 예산

| 파일 | gzip 상한 |
| --- | --- |
| 학년별 뱅크 (각) | 150KB |
| 게임 번들 | 100KB |

초과하면 템플릿당 변형 수(기본 60)를 줄인다.

## 완료 조건

- [ ] `build:bank` · `validate:bank` 모두 exit 0
- [ ] 두 번 구운 결과의 해시가 같다
- [ ] `npm run build` 성공
- [ ] gzip 크기가 예산 안이다
- [ ] `public/data/`·`dist/`를 커밋하지 않았다
