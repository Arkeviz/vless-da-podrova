import { isBypassedHost } from '@vdp/shared'
import { browser } from 'wxt/browser'
import { tabDomainsItem } from '../model/storage'

/** Новые хосты пишутся пачкой — запросов на странице сотни. */
const FLUSH_MS = 1_000
/** Больше на вкладку не храним: такие страницы — редкость, а попапу хватит и этого. */
const MAX_HOSTS_PER_TAB = 500

/**
 * Фон: какие хосты запрашивает каждая вкладка. Новая загрузка страницы начинает список заново.
 * Chromium видит запросы, только если выдан доступ к сайтам.
 */
export class TabDomainsCollector {
  private hosts = new Map<number, Set<string>>()
  private dirty = new Set<number>()
  private removed = new Set<number>()
  private timer: ReturnType<typeof setTimeout> | null = null

  async start(): Promise<void> {
    // Фон мог перезапуститься — продолжаем со списков из session-хранилища.
    for (const [tabId, hosts] of Object.entries(await tabDomainsItem.getValue())) {
      const id = Number(tabId)
      if (!this.hosts.has(id)) this.hosts.set(id, new Set(hosts))
    }
  }

  onRequest(details: { tabId: number; url: string; type: string }): void {
    if (details.tabId < 0) return
    let host: string
    try {
      host = new URL(details.url).hostname.toLowerCase()
    } catch {
      return
    }

    if (details.type === 'main_frame') {
      this.hosts.set(details.tabId, new Set())
    }
    if (!host || isBypassedHost(host)) {
      if (details.type === 'main_frame') this.markDirty(details.tabId)
      return
    }

    let set = this.hosts.get(details.tabId)
    if (!set) {
      set = new Set()
      this.hosts.set(details.tabId, set)
    }
    if (set.has(host) || set.size >= MAX_HOSTS_PER_TAB) {
      if (details.type === 'main_frame') this.markDirty(details.tabId)
      return
    }
    set.add(host)
    this.markDirty(details.tabId)
  }

  onTabRemoved(tabId: number): void {
    this.hosts.delete(tabId)
    this.removed.add(tabId)
    this.markDirty(tabId)
  }

  private markDirty(tabId: number): void {
    this.dirty.add(tabId)
    this.timer ??= setTimeout(() => void this.flush(), FLUSH_MS)
  }

  async flush(): Promise<void> {
    this.timer = null
    const stored = { ...(await tabDomainsItem.getValue()) }
    for (const tabId of this.dirty) {
      const set = this.hosts.get(tabId)
      if (set && !this.removed.has(tabId)) stored[tabId] = [...set]
      else delete stored[tabId]
    }
    this.dirty.clear()
    this.removed.clear()
    await tabDomainsItem.setValue(stored)
  }
}

export function startTabDomains(): void {
  const collector = new TabDomainsCollector()
  // Слушатели — синхронно, чтобы MV3 будил фон на эти события.
  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      collector.onRequest(details)
      return undefined
    },
    { urls: ['<all_urls>'] },
  )
  browser.tabs.onRemoved.addListener((tabId) => collector.onTabRemoved(tabId))
  void collector.start()
}
