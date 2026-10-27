import { storage } from 'wxt/utils/storage'

/** Вкладки в режиме «через прокси». session: id вкладок не переживают перезапуск браузера. */
export const tabModeTabsItem = storage.defineItem<number[]>('session:tabModeTabs', { fallback: [] })

/** Сайты вкладок в режиме - пишет фон, по ним Chromium подставляет выученные домены. */
export const activeSitesItem = storage.defineItem<string[]>('session:tabModeActiveSites', {
  fallback: [],
})

/** «Всегда для этого сайта»: вкладка с таким сайтом сама включает режим. */
export const alwaysSitesItem = storage.defineItem<string[]>('local:tabModeAlwaysSites', {
  fallback: [],
})

/** Chromium: домены, к которым ходили вкладки сайта в режиме, - по сайту. */
export const learnedDomainsItem = storage.defineItem<Record<string, string[]>>('local:tabModeLearned', {
  fallback: {},
})

/** Домены, которые никогда не выучиваются (вместе с поддоменами). */
export const learnIgnoreItem = storage.defineItem<string[]>('local:tabModeIgnore', { fallback: [] })
