import { clashTraffic, clashTrafficTotals, type TrafficSample, type TrafficTotals } from '@vdp/shared'
import { onScopeDispose, shallowRef, watch } from 'vue'
import { useClashEndpoint } from './useClashEndpoint'

const TOTALS_POLL_MS = 2_000

/** Скорость (поток /traffic) и суммарный трафик (/connections) запущенного ядра. */
export function useTraffic() {
  const { endpoint } = useClashEndpoint()
  const speed = shallowRef<TrafficSample | null>(null)
  const totals = shallowRef<TrafficTotals | null>(null)

  let controller: AbortController | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  function stop() {
    controller?.abort()
    controller = null
    if (timer) clearInterval(timer)
    timer = null
    speed.value = null
    totals.value = null
  }

  watch(
    endpoint,
    (current) => {
      stop()
      if (!current) return

      const ownController = new AbortController()
      controller = ownController
      void (async () => {
        try {
          for await (const sample of clashTraffic(current, ownController.signal)) speed.value = sample
        } catch {
          // Поток прервался (остановка ядра или закрытие попапа) — просто перестаём показывать.
        }
      })()

      const pollTotals = () =>
        clashTrafficTotals(current).then(
          (value) => (totals.value = value),
          () => undefined,
        )
      void pollTotals()
      timer = setInterval(pollTotals, TOTALS_POLL_MS)
    },
    { immediate: true },
  )

  onScopeDispose(stop)

  return { speed, totals }
}
