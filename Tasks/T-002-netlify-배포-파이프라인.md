---
id: T-002
title: Netlify 배포 파이프라인
phase: 0
status: done
agent: deploy-ops
skills: [build-bank]
depends: [T-001]
refs: ["기획서 §15.1", "기획서 §15.4", "31-아키텍처"]
---

# T-002 · Netlify 배포 파이프라인

## 목표

**검은 화면이라도 Netlify URL이 열린다.** 코드가 거의 없는 지금 빌드 순서가 Netlify에서 도는지 확인해두면, 이후 모든 배포가 조용해진다.

## 배경

이 프로젝트는 **순수 정적 배포**다. 서버리스 함수조차 쓰지 않는다. 이 태스크는 **뱅크 생성 → 검증 → 빌드** 순서가 실제로 도는지를 증명하는 것이다.

## 범위

- [ ] `netlify.toml` 작성 — 빌드 명령, `publish = "dist"`, `NODE_VERSION`
- [ ] `/data/*`에 `Cache-Control: public, max-age=31536000, immutable` 헤더
- [ ] `shared/schema.ts` 최소 Zod 스키마 (필드 확정은 T-016)
- [ ] `tools/build-bank.ts` 스텁 — 빈 뱅크 JSON 4개를 `public/data/`에 산출
- [ ] `tools/validate-bank.ts` 스텁 — 항상 exit 0 (검증 로직은 T-018)
- [ ] Netlify 사이트 연결 및 첫 배포

## 빌드 명령

```toml
command = "npm run build:bank && npm run validate:bank && npm run build"
```

Netlify가 `package-lock.json`을 보고 의존성을 자동 설치하므로 `npm ci`는 넣지 않는다. 로컬 재현 시에만 앞에 붙인다.

## 완료 조건 (DoD)

- [ ] 로컬에서 위 명령을 **같은 순서로** 실행해 성공
- [ ] Netlify 배포 로그에 `build:bank`·`validate:bank` 실행 흔적이 보인다
- [ ] 배포된 URL이 열리고 캔버스가 보인다
- [ ] `https://<site>/data/bank-g3.json`이 200으로 응답한다
- [ ] 응답 헤더에 `Cache-Control: immutable`이 있다

## 주의

**검증 단계를 빌드 명령에서 빼지 않는다.** 나중에 `validate:bank`가 실패한다고 여기서 제거하면, 잘못된 문항이 그대로 배포된다. 빌드가 곧 검증이라는 것이 의도된 설계다.

---

## 결과 (2026-08-20)

**로컬 재현 + 실제 배포 모두 통과.**

### 산출

| 경로 | 내용 |
| --- | --- |
| `netlify.toml` | 빌드 명령, `publish=dist`, `NODE_VERSION=24`, 캐시·보안 헤더 |
| `shared/domain.ts` | Domain 4종, Grade·Semester·Difficulty, 영역 비중, `bandOf()`, 성취기준 정규식 |
| `shared/schema.ts` | `QuestionSchema`·`BankSchema` (Zod) + `z.infer` 타입 |
| `tools/paths.ts` | 산출 경로 단일화 |
| `tools/build-bank.ts` | 빈 뱅크 4종 산출. 결정적 |
| `tools/validate-bank.ts` | 스키마 파싱 + 리포트, 실패 시 `exit 1` |
| `tests/tools/schema.test.ts` | 계약 검증 11케이스 |

### 실측

| 검증 | 결과 |
| --- | --- |
| `build:bank` → `validate:bank` → `build` | 전부 exit 0 |
| **결정성** — 두 번 구운 `bank-g4.json` 해시 | `bbe99048688e2fd3` 동일 ✓ |
| **실패 경로** — 스키마 위반 주입 | 4건 검출, **exit 1** ✓ |
| `typecheck` · `lint` · `test` | 통과 (테스트 11/11) |
| `dist/data/bank-g{3,4,5,6}.json` | 배포물에 포함 확인 |
| preview 서버 `/`, `/data/bank-g3.json`, `/assets/*` | 전부 HTTP 200 |

검출된 위반 예시 — 계약이 실제로 작동한다:

```
FAIL  bank-g4.json  questions.0.grade: Invalid input
FAIL  bank-g4.json  questions.0.domain: Invalid option: expected one of "수와 연산"|…
FAIL  bank-g4.json  questions.0.standard: 성취기준 코드 형식이 아닙니다 (예: 4수01-15)
FAIL  bank-g4.json  questions.0.misconceptionTag: Too small: expected string to have >=1 characters
```

### 설계와 달라진 점

1. **`npm ci`를 빌드 명령에서 뺐다.** Netlify가 `package-lock.json`을 보고 의존성을 자동 설치한 뒤 명령을 실행하므로, 넣으면 설치가 두 번 돈다. 기획서 §15.4·deploy-ops·build-bank 스킬을 함께 고쳤다.
2. **`NODE_VERSION`을 20 → 24로 올렸다.** Vite 8이 `^20.19 || >=22.12`, Vitest 4가 `^20 || ^22 || >=24`(23 제외)를 요구한다. 로컬과 맞췄다.
3. **`tests/tools/schema.test.ts`를 추가했다.** 원래 범위 밖이지만 `npm run test`가 파일 0개로 통과하던 상태라 게이트가 무의미했다. 계약이 잘못된 문항을 실제로 막는지 11케이스로 검증한다.
4. **ESLint에 `argsIgnorePattern: '^_'`를 추가했다.** tsconfig의 `noUnusedParameters`는 `_` 접두를 허용하는데 ESLint 기본값은 아니라 서로 충돌했다.

### 배포 완료 (2026-08-20)

GitHub 연결 후 **첫 배포 성공.** `https://mathstack.netlify.app` 가 열리고 게임 루프가 돈다.

| DoD | 결과 |
| --- | --- |
| Netlify 사이트 연결 및 첫 배포 | ✅ |
| 배포 로그에 `build:bank`·`validate:bank` 흔적 | ✅ **배포 성공 자체가 증거다** — command 가 `&&` 체인이라 둘 중 하나라도 exit 1 이면 배포가 실패한다 |
| 배포된 URL 이 열리고 캔버스가 보인다 | ✅ 실기기 240Hz 에서 확인 |
| `/data/bank-gN.json` 200 | ✅ 3·4·5·6학년 4개 전부 200 |
| `Cache-Control: immutable` 헤더 | ✅ 아래 실측 |

`netlify.toml` 이 자동으로 읽혀 대시보드 빌드 설정은 건드리지 않았다.

### 배포 헤더 실측 (사이트 Public 전환 후)

```
GET /data/bank-g3.json
  200  Cache-Control: public,max-age=31536000,immutable   ← 뱅크는 영구 캐시
       Content-Type: application/json
       Etag: "202e336baf3a4b37a89667507ae01fdc-ssl"
       X-Content-Type-Options: nosniff
       Referrer-Policy: strict-origin-when-cross-origin

GET /
  200  Cache-Control: public,max-age=0,must-revalidate    ← 진입 문서는 항상 최신
       X-Content-Type-Options: nosniff
```

`netlify.toml` 의 4개 `[[headers]]` 블록이 전부 의도대로 적용됐다. 뱅크는 영구 캐시, 진입 문서는 매번 재검증 — 새 배포가 나가면 `index.html` 이 새 번들 해시를 가리키므로 캐시가 꼬이지 않는다.

**Private/Public** — Netlify pre-launch 기능. 개발 중에는 Private 이 낫고, 교실에서 실제로 쓸 때 Public 으로 전환한다. 현재 Public.
