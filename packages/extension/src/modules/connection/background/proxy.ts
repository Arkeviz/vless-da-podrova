/**
 * Направление трафика браузера в ядро.
 * Chromium: PAC-скрипт через proxy.settings. Firefox: proxy.onRequest.
 */
import {
  buildPacScript,
  resolveBrowserRoute,
  type CorePorts,
  type DomainRuleTable,
} from '@vdp/shared'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'

let firefoxState: { ports: CorePorts; domainRules: DomainRuleTable } | null = null

/** Firefox: слушатель регистрируется синхронно при старте фона, пока портов нет — всё напрямую. */
export function installFirefoxProxyListener(): void {
  const proxy = (browser as unknown as { proxy: FirefoxProxyApi }).proxy
  proxy.onRequest.addListener(
    (details) => {
      if (!firefoxState) return { type: 'direct' }
      const { ports, domainRules } = firefoxState
      const route = resolveBrowserRoute(new URL(details.url).hostname, domainRules)
      if (route === 'direct') return { type: 'direct' }
      // proxyDNS: имя хоста резолвит ядро, а не системный DNS.
      const port = route === 'proxy' ? ports.proxy : ports.auto
      return { type: 'socks', host: '127.0.0.1', port, proxyDNS: true }
    },
    { urls: ['<all_urls>'] },
  )
  proxy.onError.addListener((error) => console.error('[proxy]', error.message))
}

export async function applyProxy(ports: CorePorts, domainRules: DomainRuleTable): Promise<void> {
  if (import.meta.env.FIREFOX) {
    firefoxState = { ports, domainRules }
    return
  }

  const current = await browser.proxy.settings.get({})
  if (current.levelOfControl === 'controlled_by_other_extensions') {
    throw new Error(ru.errors.proxyControlledByOther)
  }
  await browser.proxy.settings.set({
    value: {
      mode: 'pac_script',
      pacScript: {
        data: buildPacScript({ autoPort: ports.auto, proxyPort: ports.proxy, domainRules }),
      },
    },
    scope: 'regular',
  })
}

export async function clearProxy(): Promise<void> {
  if (import.meta.env.FIREFOX) {
    firefoxState = null
    return
  }
  await browser.proxy.settings.clear({ scope: 'regular' })
}

type FirefoxProxyInfo =
  | { type: 'direct' }
  | { type: 'socks'; host: string; port: number; proxyDNS: boolean }

interface FirefoxProxyApi {
  onRequest: {
    addListener(
      listener: (details: { url: string; tabId: number }) => FirefoxProxyInfo,
      filter: { urls: string[] },
    ): void
  }
  onError: { addListener(listener: (error: Error) => void): void }
}
