import {
  compileDomainRules,
  ICON_COLORS,
  renderIcon,
  resolveBrowserRoute,
  type DomainRuleTable,
  type IconState,
} from '@vdp/shared'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'
import { connectionStatusItem, type ConnectionStatus } from '@/modules/connection'
import { getRoutingSnapshot, watchRouting, type RoutingSnapshot } from '@/modules/routing'

const ICON_SIZES = [16, 32] as const
const BADGE_COLORS = { proxy: '#2f6fde', direct: '#6a7280' } as const

type Tab = { id?: number; url?: string }
/** «core» — решают правила ядра, браузер заранее этого не знает. */
type Verdict = 'proxy' | 'direct' | 'core'

// MV3 — action, Firefox MV2 — browserAction.
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

function verdictFor(url: string | undefined, routing: RoutingSnapshot, table: DomainRuleTable): Verdict | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

  const route = resolveBrowserRoute(parsed.hostname, table)
  if (route !== 'auto') return route
  // Без правил ядра всё решает действие по умолчанию.
  return routing.coreRules.length ? 'core' : routing.defaultAction
}

class Indicator {
  private status: ConnectionStatus = { state: 'off' }
  private routing: RoutingSnapshot | null = null
  private table: DomainRuleTable = compileDomainRules([])

  async refreshAll(): Promise<void> {
    this.status = await connectionStatusItem.getValue()
    this.routing = await getRoutingSnapshot()
    this.table = compileDomainRules(this.routing.browserRules)

    await action.setIcon({ imageData: iconFor(this.status.state) })
    for (const tab of await browser.tabs.query({})) await this.refreshTab(tab)
  }

  async refreshTab(tab: Tab): Promise<void> {
    if (tab.id === undefined || !this.routing) return
    const verdict = this.status.state === 'on' ? verdictFor(tab.url, this.routing, this.table) : null

    const text = verdict === 'proxy' ? 'P' : verdict === 'direct' ? 'D' : ''
    const title = verdict
      ? `${ru.appName} — ${ru.indicator.verdict[verdict]}`
      : `${ru.appName} — ${ru.connection.state[this.status.state]}`

    try {
      await action.setBadgeText({ tabId: tab.id, text })
      if (verdict === 'proxy' || verdict === 'direct') {
        await action.setBadgeBackgroundColor({ tabId: tab.id, color: BADGE_COLORS[verdict] })
      }
      await action.setTitle({ tabId: tab.id, title })
    } catch {
      // Вкладку успели закрыть.
    }
  }
}

/** Фон: цвет иконки — состояние подключения, бейдж — как идёт текущая вкладка. */
export function startIndicator(): void {
  const indicator = new Indicator()
  let queue: Promise<void> = Promise.resolve()
  const enqueue = (task: () => Promise<void>) => {
    queue = queue.then(task).catch((error) => console.error('[indicator]', error))
  }

  connectionStatusItem.watch(() => enqueue(() => indicator.refreshAll()))
  watchRouting(() => enqueue(() => indicator.refreshAll()))
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'loading') enqueue(() => indicator.refreshTab(tab))
  })

  enqueue(() => indicator.refreshAll())
}
