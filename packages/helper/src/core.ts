import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { assignToKillOnCloseJob } from './job-object'
import { canConnect } from './net'
import { configPath, corePath, runDir } from './paths'

const LOG_LIMIT = 500
// С rule-set'ами первый запуск ждёт их скачивания.
const READY_TIMEOUT_MS = 30_000
const READY_POLL_MS = 100
const STOP_TIMEOUT_MS = 3_000

export interface CoreExit {
  code: number | null
  logTail: string[]
}

export class Core {
  private child: ChildProcess | null = null
  private startedAt: number | null = null
  private readonly log: string[] = []
  /** Процессы, которые мы остановили сами, - их завершение не считается падением. */
  private readonly stoppedByUs = new WeakSet<ChildProcess>()

  constructor(private readonly onUnexpectedExit: (exit: CoreExit) => void) {}

  get status() {
    return {
      running: this.child !== null,
      pid: this.child?.pid ?? null,
      startedAt: this.startedAt,
    }
  }

  tail(lines = 100): string[] {
    return this.log.slice(-lines)
  }

  async version(): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn(corePath, ['version'], { windowsHide: true })
      let output = ''
      child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()))
      child.once('error', () => resolve(null))
      child.once('exit', () => resolve(/sing-box version (\S+)/.exec(output)?.[1] ?? null))
    })
  }

  async start(config: unknown, readinessPort: number): Promise<number> {
    await this.stop()

    await mkdir(runDir, { recursive: true })
    await writeFile(configPath, JSON.stringify(config, null, 2))

    const child = spawn(corePath, ['run', '-c', configPath, '--disable-color'], {
      cwd: runDir,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    this.child = child
    this.startedAt = Date.now()
    this.log.length = 0

    for (const stream of [child.stdout, child.stderr]) {
      createInterface({ input: stream! }).on('line', (line) => this.pushLog(line))
    }

    const exited = new Promise<CoreExit>((resolve) => {
      child.once('error', (error) => {
        this.pushLog(`[helper] не удалось запустить ядро: ${error.message}`)
        resolve(this.handleExit(child, null))
      })
      child.once('exit', (code) => resolve(this.handleExit(child, code)))
    })

    if (child.pid !== undefined) {
      try {
        assignToKillOnCloseJob(child.pid)
      } catch (error) {
        this.pushLog(`[helper] Job Object недоступен: ${(error as Error).message}`)
      }
    }

    const outcome = await Promise.race([
      this.waitForPort(child, readinessPort),
      exited.then(() => 'exited' as const),
    ])
    if (outcome === 'exited') {
      throw new Error(`Ядро завершилось при запуске:\n${this.tail(20).join('\n')}`)
    }
    if (outcome === 'timeout') {
      await this.stop()
      throw new Error('Ядро не начало принимать соединения за отведённое время')
    }

    exited.then((exit) => {
      if (!this.stoppedByUs.has(child)) this.onUnexpectedExit(exit)
    })

    return child.pid!
  }

  async stop(): Promise<void> {
    const child = this.child
    if (!child) return

    this.stoppedByUs.add(child)
    const exited = new Promise((resolve) => child.once('exit', resolve))
    child.kill()
    await Promise.race([exited, Bun.sleep(STOP_TIMEOUT_MS)])
    this.child = null
    this.startedAt = null
    await rm(configPath, { force: true })
  }

  private handleExit(child: ChildProcess, code: number | null): CoreExit {
    if (this.child === child) {
      this.child = null
      this.startedAt = null
    }
    this.pushLog(`[helper] ядро завершилось с кодом ${code}`)
    return { code, logTail: this.tail(20) }
  }

  private async waitForPort(child: ChildProcess, port: number): Promise<'ready' | 'timeout' | 'exited'> {
    const deadline = Date.now() + READY_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (this.child !== child) return 'exited'
      if (await canConnect(port)) return 'ready'
      await Bun.sleep(READY_POLL_MS)
    }
    return 'timeout'
  }

  private pushLog(line: string) {
    this.log.push(line)
    if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT)
  }
}
