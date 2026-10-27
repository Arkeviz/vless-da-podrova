/**
 * Smoke-тест собранного хелпера с поддельным ядром.
 * Запуск: pnpm --filter @vdp/helper smoke
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { copyFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encodeNativeMessage, NativeMessageDecoder } from '@vdp/shared'

const root = join(import.meta.dir, '..')
const installDir = mkdtempSync(join(tmpdir(), 'vdp-smoke-'))
execFileSync('bun', ['build', join(import.meta.dir, 'fake-core.ts'), '--compile', '--outfile', join(installDir, 'sing-box.exe')], { stdio: 'ignore' })
copyFileSync(join(root, 'dist', 'vless-da-podrova-helper.exe'), join(installDir, 'helper.exe'))

class Client {
  readonly proc: ChildProcess
  private nextId = 1
  private pending = new Map<number, (m: any) => void>()
  readonly events: any[] = []

  constructor() {
    this.proc = spawn(join(installDir, 'helper.exe'), ['chrome-extension://test/'], { stdio: ['pipe', 'pipe', 'inherit'] })
    const decoder = new NativeMessageDecoder()
    this.proc.stdout!.on('data', (chunk: Buffer) => {
      for (const message of decoder.push(chunk) as any[]) {
        if (message.type === 'event') this.events.push(message)
        else this.pending.get(message.id)?.(message)
      }
    })
  }

  call(type: string, params: object = {}): Promise<any> {
    const id = this.nextId++
    return new Promise((resolve) => {
      this.pending.set(id, resolve)
      this.proc.stdin!.write(encodeNativeMessage({ id, type, ...params }))
    })
  }

  exited(): Promise<void> {
    return new Promise((resolve) => this.proc.once('exit', () => resolve()))
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

let failures = 0
function check(name: string, condition: boolean, details?: unknown) {
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${name}${condition ? '' : ` ${JSON.stringify(details)}`}`)
  if (!condition) failures++
}

async function startCore(client: Client, extra: object = {}) {
  const { result } = await client.call('allocatePorts', { count: 3 })
  const port = result.ports[0]
  return client.call('start', { config: { inbounds: [{ listen_port: port }], ...extra }, readinessPort: port })
}

// 1. Базовые команды и штатная остановка.
{
  const client = new Client()
  const hello = await client.call('hello')
  check('hello', hello.ok && hello.result.coreVersion === '0.0.0-fake' && hello.result.protocolVersion === 1, hello)

  const ports = await client.call('allocatePorts', { count: 3 })
  check('allocatePorts', ports.ok && new Set(ports.result.ports).size === 3, ports)

  const started = await startCore(client)
  check('start', started.ok && typeof started.result.pid === 'number', started)
  const pid = started.result.pid

  const status = await client.call('status')
  check('status running', status.result.running === true && status.result.pid === pid, status)

  const log = await client.call('log', { lines: 10 })
  check('log', log.result.lines.some((l: string) => l.includes('fake core listening')), log)

  await client.call('stop')
  check('stop убивает ядро', !alive(pid))
  check('status stopped', (await client.call('status')).result.running === false)

  const unknown = await client.call('nope')
  check('неизвестная команда', unknown.ok === false, unknown)

  // 2. Закрытие stdin - хелпер гасит ядро и выходит.
  const again = await startCore(client)
  const exited = client.exited()
  client.proc.stdin!.end()
  await exited
  check('stdin закрыт → ядро убито', !alive(again.result.pid))
}

// 3. Хелпер убит жёстко - Job Object убивает ядро.
{
  const client = new Client()
  const started = await startCore(client)
  const exited = client.exited()
  execFileSync('taskkill', ['/F', '/PID', String(client.proc.pid)], { stdio: 'ignore' })
  await exited
  await Bun.sleep(500)
  check('хелпер убит → ядро убито (Job Object)', !alive(started.result.pid), started)
}

// 4. Падение ядра - событие core-exited.
{
  const client = new Client()
  await startCore(client, { crashAfterMs: 300 })
  await Bun.sleep(1000)
  const event = client.events[0]
  check('событие core-exited', event?.event === 'core-exited' && event.code === 3, client.events)
  client.proc.stdin!.end()
  await client.exited()
}

// 5. Ядро падает при старте - понятная ошибка.
{
  const client = new Client()
  const started = await client.call('start', { config: { inbounds: [] }, readinessPort: 1 })
  check('ошибка старта', started.ok === false && /завершилось/.test(started.error), started)
  client.proc.stdin!.end()
  await client.exited()
}

console.log(failures ? `\n${failures} проверок упало` : '\nвсё ок')
process.exit(failures ? 1 : 0)
