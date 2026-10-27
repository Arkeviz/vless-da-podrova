import {
  browserVerdict,
  compileDomainRules,
  ICON_COLORS,
  renderIcon,
  toDomainSet,
  type DomainRuleTable,
  type DomainSet,
  type IconState,
} from '@vdp/shared'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'
import { connectionStatusItem, type ConnectionStatus } from '@/modules/connection'
import { getRoutingSnapshot, watchRouting, type RoutingSnapshot } from '@/modules/routing'
import { getTabModeState, watchTabMode } from '@/modules/tab-mode'

const ICON_SIZES = [16, 32] as const
const BADGE = {
  proxy: { text: 'P', color: '#2f6fde' },
  direct: { text: 'D', color: '#6a7280' },
  tab: { text: 'T', color: '#8a4fd8' },
} as const

type Tab = { id?: number; url?: string }
/** «core» - решают правила ядра, браузер заранее этого не знает; «tab» - режим вкладки. */
type Verdict = 'proxy' | 'direct' | 'core' | 'tab'

// MV3 - action, Firefox MV2 - browserAction.
const action =
  browser.action ?? (browser as unknown as { browserAction: typeof browser.action }).browserAction

const iconCache = new Map<IconState, Record<number, ImageData>>()

function iconFor(state: IconState): Record<number, ImageData> {
  let images = iconCache.get(state)
  if (!images) {
    images = Object.fromEntries(
      ICON_SIZES.map((size) => [size, new ImageData(renderIcon(size, ICON_COLORS[state]), size, size)]),
    )
    iconCache.set(state, images)
  }
  return images
}

function verdictFor(
  url: string | undefined,
  routing: RoutingSnapshot,
  table: DomainRuleTable,
  forced: DomainSet,
): Verdict | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

  return browserVerdict(parsed.hostname, {
    domainRules: table,
    forcedProxy: forced,
    hasCoreRules: routing.coreRules.length > 0,
    defaultAction: routing.defaultAction,
  })
}

class Indicator {
  private status: ConnectionStatus = { state: 'off' }
  private routing: RoutingSnapshot | null = null
  private table: DomainRuleTable = compileDomainRules([])
  private tabModeTabs = new Set<number>()
  /** Chromium: домены режима вкладки проксируются во всех вкладках. */
  private forced: DomainSet = {}

  async refreshAll(): Promise<void> {
    this.status = await connectionStatusItem.getValue()
    this.routing = await getRoutingSnapshot()
    this.table = compileDomainRules(this.routing.browserRules)
    const tabMode = await getTabModeState()
    this.tabModeTabs = new Set(tabMode.tabIds)
    this.forced = import.meta.env.FIREFOX ? {} : toDomainSet(tabMode.forcedDomains)

    await action.setIcon({ imageData: iconFor(this.status.state) })
    for (const tab of await browser.tabs.query({})) await this.refreshTab(tab)
  }

  async refreshTab(tab: Tab): Promise<void> {
    if (tab.id === undefined || !this.routing) return
    const on = this.status.state === 'on'
    const verdict: Verdict | null = !on
      ? null
      : this.tabModeTabs.has(tab.id)
        ? 'tab'
        : verdictFor(tab.url, this.routing, this.table, this.forced)

    const badge = verdict && verdict !== 'core' ? BADGE[verdict] : null
    const title = verdict
      ? `${ru.appName} - ${ru.indicator.verdict[verdict]}`
      : `${ru.appName} - ${ru.connection.state[this.status.state]}`

    try {
      await action.setBadgeText({ tabId: tab.id, text: badge?.text ?? '' })
      if (badge) await action.setBadgeBackgroundColor({ tabId: tab.id, color: badge.color })
      await action.setTitle({ tabId: tab.id, title })
    } catch {
      // Вкладку успели закрыть.
    }
  }
}

/** Фон: цвет иконки - состояние подключения, бейдж - как идёт текущая вкладка. */
export function startIndicator(): void {
  const indicator = new Indicator()
  let queue: Promise<void> = Promise.resolve()
  const enqueue = (task: () => Promise<void>) => {
    queue = queue.then(task).catch((error) => console.error('[indicator]', error))
  }

  connectionStatusItem.watch(() => enqueue(() => indicator.refreshAll()))
  watchRouting(() => enqueue(() => indicator.refreshAll()))
  watchTabMode(() => enqueue(() => indicator.refreshAll()))
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'loading') enqueue(() => indicator.refreshTab(tab))
  })

  enqueue(() => indicator.refreshAll())
}
