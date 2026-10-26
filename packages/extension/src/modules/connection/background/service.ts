import {
  buildSingboxConfig,
  CORE_PORT_COUNT,
  DEFAULT_DOH_URL,
  PROTOCOL_VERSION,
  type CorePorts,
  type HelperEvent,
} from '@vdp/shared'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'
import { getSelectedServer, watchSelectedServer, type StoredServer } from '@/modules/servers'
import { connectionStatusItem, proxyEnabledItem, RECONNECT_MESSAGE } from '../model/storage'
import { HelperClient } from './helper-client'
import { applyProxy, clearProxy, installFirefoxProxyListener } from './proxy'

/**
 * Приводит фактическое состояние (хелпер, ядро, настройки прокси) к желаемому
 * (proxyEnabled + выбранный сервер). Все переходы идут строго по очереди.
 */
class ConnectionService {
  private helper: HelperClient | null = null
  /** Конфиг сервера, с которым запущено ядро, — чтобы не перезапускать его без нужды. */
  private runningServerKey: string | null = null
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

  private async doReconcile(force: boolean): Promise<void> {
    const enabled = await proxyEnabledItem.getValue()
    const selected = enabled ? await getSelectedServer() : null

    if (!enabled || !selected) {
      await this.shutdown()
      if (enabled) await proxyEnabledItem.setValue(false)
      await connectionStatusItem.setValue({ state: 'off' })
      return
    }

    const serverKey = JSON.stringify(selected.server)
    if (!force && this.runningServerKey === serverKey) return

    await this.connect(selected, serverKey)
  }

  private async connect(selected: StoredServer, serverKey: string): Promise<void> {
    const serverName = selected.server.name
    await connectionStatusItem.setValue({ state: 'connecting', serverName })

    try {
      const helper = this.helper ?? this.openHelper()

      const hello = await helper.call('hello', {})
      if (hello.protocolVersion !== PROTOCOL_VERSION) throw new Error(ru.errors.helperOutdated)
      if (!hello.coreVersion) throw new Error(ru.errors.coreMissing)

      const { ports: allocated } = await helper.call('allocatePorts', { count: CORE_PORT_COUNT })
      const [auto, proxy, clashApi] = allocated as [number, number, number]
      const ports: CorePorts = { auto, proxy, clashApi }

      const config = buildSingboxConfig({
        server: selected.server,
        ports,
        clashApiSecret: randomSecret(),
        dohUrl: DEFAULT_DOH_URL,
      })
      await helper.call('start', { config, readinessPort: ports.auto })
      await applyProxy(ports)

      this.runningServerKey = serverKey
      await connectionStatusItem.setValue({
        state: 'on',
        serverName,
        since: Date.now(),
        coreVersion: hello.coreVersion,
        ports,
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
    this.runningServerKey = null

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
  watchSelectedServer(() => service.reconcile())
  browser.runtime.onMessage.addListener((message: unknown) => {
    if ((message as { type?: unknown })?.type === RECONNECT_MESSAGE) service.reconcile(true)
  })

  service.enqueue(() => service.init())
}
