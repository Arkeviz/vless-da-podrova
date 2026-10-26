import { isBypassedHost, matchDomainSet, toDomainSet, type DomainSet } from '@vdp/shared'
import { browser } from 'wxt/browser'
import { siteOf } from '@/common/utilities/site'
import {
  activeSitesItem,
  alwaysSitesItem,
  learnedDomainsItem,
  learnIgnoreItem,
  tabModeTabsItem,
} from '../model/storage'
import { setTabMode } from '../model/tab-mode'

/** Новые домены копятся и пишутся пачкой: каждая запись меняет PAC. */
const LEARN_FLUSH_MS = 1_000

/**
 * Фон: жизненный цикл режима вкладки — закрытие, наследование дочерними вкладками,
 * «всегда для сайта», а в Chromium — обучение доменам по запросам вкладки.
 */
export class TabModeController {
  private tabIds = new Set<number>()
  private alwaysSites: DomainSet = {}
  private ignore: DomainSet = {}
  private learned: Record<string, string[]> = {}
  /** Сайт текущей страницы каждой вкладки. */
  private readonly tabSites = new Map<number, string>()
  private pending: Record<string, Set<string>> = {}
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  async start(): Promise<void> {
    const [tabIds, alwaysSites, ignore, learned, tabs] = await Promise.all([
      tabModeTabsItem.getValue(),
      alwaysSitesItem.getValue(),
      learnIgnoreItem.getValue(),
      learnedDomainsItem.getValue(),
      browser.tabs.query({}),
    ])
    this.tabIds = new Set(tabIds)
    this.alwaysSites = toDomainSet(alwaysSites)
    this.ignore = toDomainSet(ignore)
    this.learned = learned
    for (const tab of tabs) if (tab.id !== undefined) this.updateTabSite(tab.id, tab.url)

    tabModeTabsItem.watch((value) => {
      this.tabIds = new Set(value)
      void this.syncActiveSites()
    })
    alwaysSitesItem.watch((value) => (this.alwaysSites = toDomainSet(value)))
    learnIgnoreItem.watch((value) => (this.ignore = toDomainSet(value)))
    learnedDomainsItem.watch((value) => (this.learned = value))

    // Вкладки, закрытые пока фон спал, из режима убираем.
    const alive = new Set(tabs.map((t) => t.id))
    const stale = tabIds.filter((id) => !alive.has(id))
    if (stale.length) await tabModeTabsItem.setValue(tabIds.filter((id) => alive.has(id)))
    await this.syncActiveSites()
  }

  onTabCreated(tab: { id?: number; openerTabId?: number }): void {
    if (tab.id !== undefined && tab.openerTabId !== undefined && this.tabIds.has(tab.openerTabId)) {
      void setTabMode(tab.id, true)
    }
  }

  onTabRemoved(tabId: number): void {
    this.tabSites.delete(tabId)
    if (this.tabIds.has(tabId)) void setTabMode(tabId, false)
  }

  onTabUrl(tabId: number, url: string | undefined): void {
    this.updateTabSite(tabId, url)
    void this.syncActiveSites()
  }

  /** Chromium: запрос вкладки в режиме — запоминаем домен для её сайта. */
  onRequest(details: { tabId: number; url: string; type: string }): void {
    if (details.tabId < 0) return
    if (details.type === 'main_frame') this.updateTabSite(details.tabId, details.url)
    if (!this.tabIds.has(details.tabId)) return

    const site = this.tabSites.get(details.tabId)
    let host: string
    try {
      host = new URL(details.url).hostname
    } catch {
      return
    }
    if (!site || isBypassedHost(host) || matchDomainSet(host, this.ignore)) return

    const domain = siteOf(host)
    if (domain === site || this.learned[site]?.includes(domain) || this.pending[site]?.has(domain)) return
    ;(this.pending[site] ??= new Set()).add(domain)
    this.flushTimer ??= setTimeout(() => void this.flush(), LEARN_FLUSH_MS)
  }

  private updateTabSite(tabId: number, url: string | undefined): void {
    let host: string
    try {
      const parsed = new URL(url ?? '')
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return
      host = parsed.hostname
    } catch {
      return
    }
    this.tabSites.set(tabId, siteOf(host))
    if (!this.tabIds.has(tabId) && matchDomainSet(host, this.alwaysSites)) void setTabMode(tabId, true)
  }

  private async syncActiveSites(): Promise<void> {
    const sites = new Set<string>()
    for (const id of this.tabIds) {
      const site = this.tabSites.get(id)
      if (site) sites.add(site)
    }
    const next = [...sites].sort()
    const current = await activeSitesItem.getValue()
    if (next.join() !== current.join()) await activeSitesItem.setValue(next)
  }

  private async flush(): Promise<void> {
    this.flushTimer = null
    const pending = this.pending
    this.pending = {}
    const learned = { ...(await learnedDomainsItem.getValue()) }
    for (const [site, domains] of Object.entries(pending)) {
      learned[site] = [...new Set([...(learned[site] ?? []), ...domains])].sort()
    }
    await learnedDomainsItem.setValue(learned)
  }
}

export function startTabMode(): void {
  const controller = new TabModeController()
  // Слушатели регистрируются синхронно — иначе MV3 не разбудит фон на эти события.
  browser.tabs.onCreated.addListener((tab) => controller.onTabCreated(tab))
  browser.tabs.onRemoved.addListener((tabId) => controller.onTabRemoved(tabId))
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) controller.onTabUrl(tabId, changeInfo.url)
  })
  if (!import.meta.env.FIREFOX) {
    // Неблокирующий webRequest: видит запросы, только если выдан доступ к сайтам.
    browser.webRequest.onBeforeRequest.addListener(
      (details) => {
        controller.onRequest(details)
        return undefined
      },
      { urls: ['<all_urls>'] },
    )
  }
  void controller.start()
}
