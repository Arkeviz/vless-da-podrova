/**
 * Направление трафика браузера в ядро.
 * Chromium: PAC-скрипт через proxy.settings. Firefox: proxy.onRequest.
 */
import {
  buildPacScript,
  isBypassedHost,
  matchDomainSet,
  resolveBrowserRoute,
  toDomainSet,
  type CorePorts,
  type DomainRuleTable,
} from '@vdp/shared'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'
import { setTabMode, type TabModeState } from '@/modules/tab-mode'

export interface BrowserProxyState {
  domainRules: DomainRuleTable
  tabMode: TabModeState
}

interface FirefoxState {
  ports: CorePorts
  domainRules: DomainRuleTable
  tabIds: Set<number>
  alwaysSites: TabModeState['alwaysSites']
}

let firefoxState: FirefoxState | null = null

/** Что из состояния влияет на браузерную часть — при изменении прокси переприменяется. */
export function browserProxyKey(state: BrowserProxyState): string {
  const { domainRules, tabMode } = state
  return import.meta.env.FIREFOX
    ? JSON.stringify([domainRules, tabMode.tabIds, tabMode.alwaysSites])
    : JSON.stringify([domainRules, tabMode.forcedDomains])
}

/** Firefox: слушатель регистрируется синхронно при старте фона, пока портов нет — всё напрямую. */
export function installFirefoxProxyListener(): void {
  const proxy = (browser as unknown as { proxy: FirefoxProxyApi }).proxy
  proxy.onRequest.addListener(
    (details) => {
      const state = firefoxState
      if (!state) return { type: 'direct' }
      const host = new URL(details.url).hostname
      if (isBypassedHost(host)) return { type: 'direct' }

      // Режим вкладки: точно по tabId, важнее любых правил.
      let inTabMode = state.tabIds.has(details.tabId)
      if (!inTabMode && details.type === 'main_frame' && matchDomainSet(host, state.alwaysSites)) {
        // «Всегда для сайта»: включаем режим до первого запроса страницы, не дожидаясь фона.
        state.tabIds.add(details.tabId)
        void setTabMode(details.tabId, true)
        inTabMode = true
      }

      const route = inTabMode ? 'proxy' : resolveBrowserRoute(host, state.domainRules)
      if (route === 'direct') return { type: 'direct' }
      // proxyDNS: имя хоста резолвит ядро, а не системный DNS.
      const port = route === 'proxy' ? state.ports.proxy : state.ports.auto
      return { type: 'socks', host: '127.0.0.1', port, proxyDNS: true }
    },
    { urls: ['<all_urls>'] },
  )
  proxy.onError.addListener((error) => console.error('[proxy]', error.message))
}

export async function applyProxy(ports: CorePorts, state: BrowserProxyState): Promise<void> {
  if (import.meta.env.FIREFOX) {
    firefoxState = {
      ports,
      domainRules: state.domainRules,
      tabIds: new Set(state.tabMode.tabIds),
      alwaysSites: state.tabMode.alwaysSites,
    }
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
        data: buildPacScript({
          autoPort: ports.auto,
          proxyPort: ports.proxy,
          domainRules: state.domainRules,
          forcedProxy: toDomainSet(state.tabMode.forcedDomains),
        }),
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
      listener: (details: { url: string; tabId: number; type: string }) => FirefoxProxyInfo,
      filter: { urls: string[] },
    ): void
  }
  onError: { addListener(listener: (error: Error) => void): void }
}
