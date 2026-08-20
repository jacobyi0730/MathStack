import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * AGENTS.md §2 절대 규칙 중 기계로 잡을 수 있는 것은 여기서 잡는다.
 * 규칙으로 막던 것을 도구로 막는 게 언제나 낫다.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'public/data/**', 'node_modules/**', 'coverage/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    rules: {
      // 규칙 2 — any 금지. 정말 필요하면 unknown 후 좁힌다
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',

      // tsconfig 의 noUnusedParameters 와 같은 관례를 쓴다: _ 접두는 의도된 미사용
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  {
    // 규칙: 빌드 타임 전개는 결정적이어야 한다 (36-코딩컨벤션 §3)
    files: ['tools/**/*.ts', 'content/**/*.ts'],
    rules: {
      // 빌드 도구는 CLI 다. 리포트를 stdout 으로 낸다
      'no-console': 'off',
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Math.random() 은 전역 상태라 전개가 재현되지 않는다. 시드 기반 PRNG 를 인자로 넘길 것 (36-코딩컨벤션 §3).',
        },
      ],
    },
  },

  {
    // 규칙 3 — 게임 루프에 네트워크가 없다 (34-성능예산 §2.6)
    // 뱅크 로드는 src/quiz/loader.ts 한 곳에서만 한다
    files: ['src/engine/**/*.ts', 'src/systems/**/*.ts', 'src/entities/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            '게임 루프에 네트워크 호출을 두지 않는다. 뱅크는 src/quiz/loader.ts 가 시작 전 1회 로드한다 (34-성능예산 §2.6).',
        },
      ],
    },
  },

  {
    // 런타임은 빌드 타임 전용 의존성을 참조하지 않는다 (31-아키텍처 §8)
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'fraction.js',
              message: '빌드 타임 전용이다. 번들에 새어 들면 예산을 넘긴다 (31-아키텍처 §8).',
            },
            {
              name: 'decimal.js',
              message: '빌드 타임 전용이다. 번들에 새어 들면 예산을 넘긴다 (31-아키텍처 §8).',
            },
          ],
        },
      ],
    },
  },
);
