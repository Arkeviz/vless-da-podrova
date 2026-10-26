import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  // root явно: при запуске из корня монорепо WXT иначе ищет свой конфиг не там (и алиас @/).
  // vue(): тесты импортируют модули через public API, а он реэкспортирует компоненты.
  plugins: [WxtVitest({ root }), vue()],
  test: {
    name: 'extension',
    root,
    include: ['src/**/*.test.ts'],
  },
})
