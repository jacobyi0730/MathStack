import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // public/data/ 의 생성물이 그대로 dist/data/ 로 복사된다 (31-아키텍처 §6)
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@shared': r('./shared'),
      '@src': r('./src'),
      '@tools': r('./tools'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
