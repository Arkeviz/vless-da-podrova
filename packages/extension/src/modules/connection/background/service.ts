import {
  buildSingboxConfig,
  clashSelect,
  compileDomainRules,
  CORE_PORT_COUNT,
  DEFAULT_DOH_URL,
  PROTOCOL_VERSION,
  TAG,
  type CorePorts,
  type CoreServer,
  type HelperEvent,
} from '@vdp/shared'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'
import { getRoutingSnapshot, watchRouting, type RoutingSnapshot } from '@/modules/routing'
import { getServerPool, serverTag, watchServers, type ServerPool } from '@/modules/servers'
import {
  connectionStatusItem,
  CORE_LOG_MESSAGE,
  instanceIdItem,
  proxyEnabledItem,
  RECONNECT_MESSAGE,
} from '../model/storage'
import { HelperClient } from './helper-client'
import { applyProxy, clearProxy, installFirefoxProxyListener } from './proxy'

const CORE_LOG_LINES = 300

interface Running {
  /** Всё, что попадает в конфиг ядра: при изменении ядро перезапускается. */
  coreKey: string
  /** Доменные правила браузера: при изменении меняется только PAC / onRequest. */
  browserKey: string
  /** Выбранный сервер в ручном режиме: меняется через Clash API без перезапуска. */
  selectedTag: string | null
  ports: CorePorts
  clashApiSecret: string
}

/**
 * Приводит фактическое состояние (хелпер, ядро, настройки прокси) к желаемому
 * (proxyEnabled, серверы и выбор, правила). Все переходы идут строго по очереди.
 */
class ConnectionService {
  private helper: HelperClient | null = null
  private running: Running | null = null
  private queue: Promise<void> = Promise.resolve()

  enqueue(task: () => Promise<void>): void {
    this.queue = this.queue.then(task).catch((error) => console.error('[connection]', error))
  }

  reconcile(force = false): void {
    this.enqueue(() => this.doReconcile(force))
  }

  async init(): Promise<void> {
    // Chromium сохраняет настройки прокси между запусками, а порты ядра — уже нет.
    await clearProxy()
    await connectionStatusItem.setValue({ state: 'off' })
    this.reconcile()
  }

  async coreLog(): Promise<string[]> {
    if (!this.helper) return []
    try {
      return (await this.helper.call('log', { lines: CORE_LOG_LINES })).lines
    } catch {
      return []
    }
  }

  private async doReconcile(force: boolean): Promise<void> {
    const enabled = await proxyEnabledItem.getValue()
    const pool = enabled ? await getServerPool() : null

    if (!enabled || !pool) {
      await this.shutdown()
      if (enabled) await proxyEnabledItem.setValue(false)
      await connectionStatusItem.setValue({ state: 'off' })
      return
    }

    const routing = await getRoutingSnapshot()
    const servers: CoreServer[] = pool.servers.map((s) => ({ tag: serverTag(s.id), server: s.server }))
    const selectedTag = pool.mode === 'manual' ? serverTag(pool.selected.id) : null
    const coreKey = JSON.stringify([servers, pool.mode, routing.coreRules, routing.defaultAction])
    const browserKey = JSON.stringify(routing.browserRules)

    const running = this.running
    if (force || running?.coreKey !== coreKey) {
      await this.connect(pool, servers, routing, { coreKey, browserKey, selectedTag })
      return
    }

    try {
      if (pool.mode === 'manual' && selectedTag && running.selectedTag !== selectedTag) {
        await clashSelect(
          { port: running.ports.clashApi, secret: running.clashApiSecret },
          TAG.proxy,
          selectedTag,
        )
        running.selectedTag = selectedTag
        const status = await connectionStatusItem.getValue()
        if (status.state === 'on') {
          await connectionStatusItem.setValue({ ...status, serverName: pool.selected.server.name })
        }
      }
      if (running.browserKey !== browserKey) {
        await applyProxy(running.ports, compileDomainRules(routing.browserRules))
        running.browserKey = browserKey
      }
    } catch (error) {
      console.warn('[connection] не удалось применить изменения на лету, перезапуск ядра', error)
      await this.connect(pool, servers, routing, { coreKey, browserKey, selectedTag })
    }
  }

  private async connect(
    pool: ServerPool,
    servers: CoreServer[],
    routing: RoutingSnapshot,
    keys: Pick<Running, 'coreKey' | 'browserKey' | 'selectedTag'>,
  ): Promise<void> {
    const serverName = pool.mode === 'manual' ? pool.selected.server.name : ru.servers.autoName
    await connectionStatusItem.setValue({ state: 'connecting', serverName })

    try {
      const helper = this.helper ?? this.openHelper()

      const hello = await helper.call('hello', {})
      if (hello.protocolVersion !== PROTOCOL_VERSION) throw new Error(ru.errors.helperOutdated)
      if (!hello.coreVersion) throw new Error(ru.errors.coreMissing)

      const { ports: allocated } = await helper.call('allocatePorts', { count: CORE_PORT_COUNT })
      const [auto, proxy, clashApi] = allocated as [number, number, number]
      const ports: CorePorts = { auto, proxy, clashApi }
      const clashApiSecret = randomSecret()

      const config = buildSingboxConfig({
        servers,
        selection: keys.selectedTag ? { mode: 'manual', tag: keys.selectedTag } : { mode: 'auto' },
        ports,
        clashApiSecret,
        dohUrl: DEFAULT_DOH_URL,
        rules: routing.coreRules,
        defaultAction: routing.defaultAction,
        cacheFilePath: `cache-${await instanceIdItem.getValue()}.db`,
      })
      await helper.call('start', { config, readinessPort: ports.auto })
      await applyProxy(ports, compileDomainRules(routing.browserRules))

      this.running = { ...keys, ports, clashApiSecret }
      await connectionStatusItem.setValue({
        state: 'on',
        serverName,
        mode: pool.mode,
        since: Date.now(),
        coreVersion: hello.coreVersion,
        ports,
        clashApiSecret,
      })
    } catch (error) {
      await this.fail((error as Error).message)
    }
  }

  private openHelper(): HelperClient {
    const helper = HelperClient.connect({
      onEvent: (event) => this.enqueue(() => this.onHelperEvent(helper, event)),
      onDisconnect: (message) =>
        this.enqueue(async () => {
          if (this.helper === helper) await this.fail(message)
        }),
    })
    this.helper = helper
    return helper
  }

  private async onHelperEvent(helper: HelperClient, event: HelperEvent): Promise<void> {
    if (this.helper !== helper || event.event !== 'core-exited') return
    const lastLine = event.logTail.findLast((line) => !line.startsWith('[helper]'))
    await this.fail(lastLine ? `${ru.errors.coreExited}: ${lastLine}` : ru.errors.coreExited)
  }

  /** Fail-open: прокси снимается, сайты открываются напрямую, пользователь видит ошибку. */
  private async fail(message: string): Promise<void> {
    await this.shutdown()
    await connectionStatusItem.setValue({ state: 'error', message })
  }

  private async shutdown(): Promise<void> {
    await clearProxy()
    this.running = null

    const helper = this.helper
    this.helper = null
    if (!helper) return
    try {
      await helper.call('stop', {})
    } catch {
      // Хелпер уже недоступен — ядро умрёт вместе с ним (Job Object).
    }
    helper.disconnect()
  }
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function startConnectionService(): void {
  if (import.meta.env.FIREFOX) installFirefoxProxyListener()

  const service = new ConnectionService()
  proxyEnabledItem.watch(() => service.reconcile())
  watchServers(() => service.reconcile())
  watchRouting(() => service.reconcile())
  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const type = (message as { type?: unknown })?.type
    if (type === RECONNECT_MESSAGE) service.reconcile(true)
    if (type === CORE_LOG_MESSAGE) {
      void service.coreLog().then((lines) => sendResponse({ lines }))
      return true
    }
    return undefined
  })

  service.enqueue(() => service.init())
}
