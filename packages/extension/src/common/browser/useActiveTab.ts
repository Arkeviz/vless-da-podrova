import { parse } from 'tldts'
import { shallowRef } from 'vue'
import { browser } from 'wxt/browser'

export interface ActiveTab {
  id: number
  host: string
  /** Регистрируемый домен (youtube.com для music.youtube.com); null для IP и localhost. */
  domain: string | null
}

/** Активная вкладка с http(s)-страницей; null для служебных страниц браузера. */
export function useActiveTab() {
  const tab = shallowRef<ActiveTab | null>(null)

  void browser.tabs.query({ active: true, currentWindow: true }).then(([current]) => {
    if (!current?.url || current.id === undefined) return
    let url: URL
    try {
      url = new URL(current.url)
    } catch {
      return
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return

    const parsed = parse(url.hostname)
    tab.value = { id: current.id, host: url.hostname, domain: parsed.isIp ? null : parsed.domain }
  })

  return { tab }
}
