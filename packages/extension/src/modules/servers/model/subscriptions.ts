import { decodeProfileTitle, parseSubscription, parseUserInfo } from '@vdp/shared'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'
import { ensureValidSelection } from './servers'
import { selectedServerIdItem, subscriptionsItem, type StoredServer, type Subscription } from './storage'

const DEFAULT_SUBSCRIPTION_UPDATE_HOURS = 12
const FETCH_TIMEOUT_MS = 30_000

function originPattern(url: string): string {
  return `${new URL(url).origin}/*`
}

/**
 * Chromium: доступ к адресу подписки выдаётся по запросу (optional_host_permissions).
 * Вызывать прямо в обработчике клика - браузер требует жест пользователя.
 */
export async function requestSubscriptionAccess(url: string): Promise<boolean> {
  // Firefox (MV2): доступ ко всем адресам уже есть, а запрос не объявленных в
  // optional_permissions адресов он отклоняет.
  if (import.meta.env.FIREFOX) return true
  // Без предварительного permissions.contains: лишний await теряет жест пользователя,
  // а для уже выданного доступа request сразу возвращает true.
  return browser.permissions.request({ origins: [originPattern(url)] })
}

export function validateSubscriptionUrl(raw: string): string {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error(ru.subscriptions.invalidUrl)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(ru.subscriptions.invalidUrl)
  return url.toString()
}

export async function addSubscription(rawUrl: string, name: string): Promise<Subscription> {
  const url = validateSubscriptionUrl(rawUrl)
  const subscriptions = await subscriptionsItem.getValue()
  if (subscriptions.some((s) => s.url === url)) throw new Error(ru.subscriptions.duplicate)

  const subscription: Subscription = {
    id: crypto.randomUUID(),
    url,
    name: name.trim() || new URL(url).hostname,
    customName: Boolean(name.trim()),
    updateIntervalHours: DEFAULT_SUBSCRIPTION_UPDATE_HOURS,
    lastUpdated: null,
    lastError: null,
    userInfo: null,
    servers: [],
  }
  await subscriptionsItem.setValue([...subscriptions, subscription])
  return (await updateSubscription(subscription.id)) ?? subscription
}

export async function removeSubscription(id: string): Promise<void> {
  await subscriptionsItem.setValue((await subscriptionsItem.getValue()).filter((s) => s.id !== id))
  await ensureValidSelection()
}

export async function setSubscriptionInterval(id: string, hours: number): Promise<void> {
  await patchSubscription(id, { updateIntervalHours: hours })
}

/** Скачивает подписку и перезаписывает её серверы. Ошибка сохраняется в lastError. */
export async function updateSubscription(id: string): Promise<Subscription | null> {
  const current = (await subscriptionsItem.getValue()).find((s) => s.id === id)
  if (!current) return null

  try {
    const response = await fetch(current.url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const parsed = parseSubscription(await response.text())
    if (!parsed.servers.length) {
      throw new Error(
        parsed.errors[0]?.message ?? (parsed.skipped ? ru.subscriptions.noVless : ru.subscriptions.emptyBody),
      )
    }

    // id сохраняется по ссылке, чтобы выбор сервера переживал обновление.
    const idByLink = new Map(current.servers.map((s) => [s.link, s.id]))
    const servers: StoredServer[] = parsed.servers.map(({ link, server }) => ({
      id: idByLink.get(link) ?? crypto.randomUUID(),
      link,
      server,
    }))
    const title = decodeProfileTitle(response.headers.get('profile-title'))

    const updated = await patchSubscription(id, {
      servers,
      lastUpdated: Date.now(),
      lastError: null,
      userInfo: parseUserInfo(response.headers.get('subscription-userinfo')),
      ...(!current.customName && title ? { name: title } : {}),
    })

    if (!(await selectedServerIdItem.getValue()) && servers[0]) {
      await selectedServerIdItem.setValue(servers[0].id)
    }
    await ensureValidSelection()
    return updated
  } catch (error) {
    return patchSubscription(id, { lastError: describeFetchError(error) })
  }
}

/** Обновляет подписки, у которых истёк интервал. Вызывается фоном по будильнику. */
export async function updateDueSubscriptions(now = Date.now()): Promise<void> {
  for (const subscription of await subscriptionsItem.getValue()) {
    const dueAt = (subscription.lastUpdated ?? 0) + subscription.updateIntervalHours * 3_600_000
    if (dueAt <= now) await updateSubscription(subscription.id)
  }
}

async function patchSubscription(id: string, patch: Partial<Subscription>): Promise<Subscription | null> {
  let result: Subscription | null = null
  const subscriptions = (await subscriptionsItem.getValue()).map((s) => {
    if (s.id !== id) return s
    result = { ...s, ...patch }
    return result
  })
  await subscriptionsItem.setValue(subscriptions)
  return result
}

function describeFetchError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'TimeoutError') return ru.subscriptions.timeout
  // Chromium без выданного доступа к адресу отвечает CORS-ошибкой - fetch падает с TypeError.
  if (error instanceof TypeError) return ru.subscriptions.network
  return (error as Error).message
}
