/**
 * Нативный хост vless-da-podrova. Браузер запускает его по запросу расширения
 * и общается через stdin/stdout (native messaging). Stdout — только для протокола.
 */
import { appendFileSync } from 'node:fs'
import {
  CORE_PORT_COUNT,
  encodeNativeMessage,
  NativeMessageDecoder,
  PROTOCOL_VERSION,
  type HelperCommands,
  type HelperOutgoing,
  type HelperRequest,
} from '@vdp/shared'
import packageJson from '../../../package.json'
import { Core } from './core'
import { allocatePorts } from './net'
import { helperLogPath } from './paths'

function debug(message: string) {
  try {
    appendFileSync(helperLogPath, `${new Date().toISOString()} [${process.pid}] ${message}\n`)
  } catch {
    // Лог хелпера не критичен.
  }
}

function send(message: HelperOutgoing) {
  process.stdout.write(encodeNativeMessage(message))
}

const core = new Core((exit) => {
  debug(`ядро упало, код ${exit.code}`)
  send({ type: 'event', event: 'core-exited', code: exit.code, logTail: exit.logTail })
})

type Handlers = {
  [K in keyof HelperCommands]: (
    request: Extract<HelperRequest, { type: K }>,
  ) => Promise<HelperCommands[K]['result']>
}

const handlers: Handlers = {
  async hello() {
    return {
      protocolVersion: PROTOCOL_VERSION,
      helperVersion: packageJson.version,
      coreVersion: await core.version(),
    }
  },
  async allocatePorts({ count }) {
    if (!Number.isInteger(count) || count < 1 || count > CORE_PORT_COUNT * 2) {
      throw new Error(`Некорректное число портов: ${count}`)
    }
    return { ports: await allocatePorts(count) }
  },
  async start({ config, readinessPort }) {
    return { pid: await core.start(config, readinessPort) }
  },
  async stop() {
    await core.stop()
    return {}
  },
  async status() {
    return core.status
  },
  async log({ lines }) {
    return { lines: core.tail(lines) }
  },
}

async function handle(request: HelperRequest) {
  const handler = handlers[request.type] as ((r: HelperRequest) => Promise<unknown>) | undefined
  if (!handler) {
    send({ id: request.id, ok: false, error: `Неизвестная команда: ${request.type}` })
    return
  }
  try {
    send({ id: request.id, ok: true, result: await handler(request) })
  } catch (error) {
    debug(`${request.type}: ${(error as Error).message}`)
    send({ id: request.id, ok: false, error: (error as Error).message })
  }
}

async function shutdown(reason: string) {
  debug(`завершение: ${reason}`)
  await core.stop()
  process.exit(0)
}

// Команды выполняются строго по очереди, чтобы start/stop не пересекались.
let queue = Promise.resolve()
const decoder = new NativeMessageDecoder()

process.stdin.on('data', (chunk: Buffer) => {
  let messages: unknown[]
  try {
    messages = decoder.push(chunk)
  } catch (error) {
    void shutdown(`битое сообщение: ${(error as Error).message}`)
    return
  }
  for (const message of messages) {
    queue = queue.then(() => handle(message as HelperRequest))
  }
})

// Браузер закрыл порт (или сам завершился) — гасим ядро и выходим.
process.stdin.on('end', () => void queue.then(() => shutdown('stdin закрыт')))

debug(`запущен, аргументы: ${JSON.stringify(process.argv.slice(2))}`)
