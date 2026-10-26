import { parse } from 'tldts'
import { shallowRef } from 'vue'
import { browser } from 'wxt/browser'

export interface ActiveSite {
  host: string
  /** Регистрируемый домен (youtube.com для music.youtube.com); null для IP и localhost. */
  domain: string | null
}

/** Сайт активной вкладки. Доступ к её URL даёт разрешение activeTab при открытии попапа. */
export function useActiveSite() {
  const site = shallowRef<ActiveSite | null>(null)

  void browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab?.url) return
    let url: URL
    try {
      url = new URL(tab.url)
    } catch {
      return
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return

    const parsed = parse(url.hostname)
    site.value = {
      host: url.hostname,
      domain: parsed.isIp ? null : parsed.domain,
    }
  })

  return { site }
}
