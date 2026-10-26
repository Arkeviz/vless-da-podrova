import { clashDelay, URL_TEST_URL } from '@vdp/shared'
import { reactive, readonly, watch } from 'vue'
import { serverTag, type ServerLatency } from '@/modules/servers'
import { useClashEndpoint } from './useClashEndpoint'

const TIMEOUT_MS = 5_000
const CONCURRENCY = 6

/** Замер задержки серверов через ядро: Clash API гоняет запрос через выход каждого сервера. */
export function useLatency() {
  const { endpoint } = useClashEndpoint()
  const latency = reactive<Record<string, ServerLatency>>({})

  // Новый запуск ядра — старые замеры уже ни о чём не говорят.
  watch(endpoint, () => {
    for (const id of Object.keys(latency)) delete latency[id]
  })

  async function testAll(ids: string[]) {
    const current = endpoint.value
    if (!current) return
    for (const id of ids) latency[id] = 'testing'

    const queue = [...ids]
    const worker = async () => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        try {
          latency[id] = await clashDelay(current, serverTag(id), { url: URL_TEST_URL, timeoutMs: TIMEOUT_MS })
        } catch {
          latency[id] = 'error'
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  }

  return { latency: readonly(latency), canTest: endpoint, testAll }
}
