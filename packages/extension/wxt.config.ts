import { defineConfig } from 'wxt'

/** Публичный ключ фиксирует ID расширения в Chromium (нужен для allowed_origins хелпера). */
const CHROMIUM_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlsNy3qYyB8kmDL1Vio8EPBMWDqgZzXbyWOK1T2L5AvPj2QQ9e5Cc0shTHzd/tYSPZPHbhOi0M44dJj9iBFy6y22Xxv5OW7Tcm9Iw4Hr9D4YLu7VOY7DzyAdLjUFG+2fuFZ2U2TlWsZqd44pZrV2lzAiHSwBW3bZCtHnug/xL6omIEI0EkdePyC6Vy1fj6YThU7rXguYnxhxvoZICHrhniXEgQOsHFVWab4o/Va/2lnNkDX/HN+6yB/JLYEGC8lwtRIrfgIeXq7o2fRHWNf0g0wt6/6TUWXVj1P+l1Ch5b5UkjUpbYQplpSvfQinSm5ox48zn+6XXuBFVhSS52sF2gQIDAQAB'
export const FIREFOX_EXTENSION_ID = 'vless-da-podrova@extension'

export default defineConfig({
  srcDir: 'src',
  entrypointsDir: 'app/entrypoints',
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    build: {
      rollupOptions: {
        treeshake: {
          // tldts не объявляет sideEffects: false, и без подсказки его таблица суффиксов
          // попадает в фон, которому она не нужна (фон импортирует только модель правил).
          moduleSideEffects: (id: string) => !/[\\/]tldts(-core)?[\\/]/.test(id),
        },
      },
    },
  }),
  manifest: ({ browser }) => ({
    name: 'vless-da-podrova',
    description: 'Трафик браузера через собственный VLESS-сервер',
    permissions: [
      'storage',
      'proxy',
      'nativeMessaging',
      // URL активной вкладки для кнопки «этот сайт» — только когда открыт попап.
      'activeTab',
      // Firefox (MV2): proxy.onRequest видит только запросы к разрешённым хостам.
      ...(browser === 'firefox' ? ['<all_urls>'] : []),
    ],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: FIREFOX_EXTENSION_ID,
              strict_min_version: '115.0',
              // Расширение никуда не отправляет данные пользователя.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : { key: CHROMIUM_PUBLIC_KEY }),
  }),
})
