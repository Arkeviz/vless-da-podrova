import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'shared', include: ['packages/shared/src/**/*.test.ts'] } },
      // Тесты расширения идут с фейковым браузером WXT - у пакета свой конфиг.
      'packages/extension',
    ],
  },
})
