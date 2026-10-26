import { storage } from 'wxt/utils/storage'

/**
 * Хосты, к которым обращалась каждая вкладка с последней загрузки страницы (ключ — id вкладки).
 * session: id вкладок не переживают перезапуск браузера, а фон MV3 может засыпать.
 */
export const tabDomainsItem = storage.defineItem<Record<string, string[]>>('session:tabDomains', {
  fallback: {},
})
