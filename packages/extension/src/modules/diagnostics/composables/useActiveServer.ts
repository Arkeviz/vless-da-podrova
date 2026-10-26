import { clashGroupNow, TAG } from '@vdp/shared'
import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import { serverTag, useServers } from '@/modules/servers'
import { useClashEndpoint } from './useClashEndpoint'

const POLL_MS = 5_000

/** Режим «авто»: какой сервер urltest выбрал сейчас. */
export function useActiveServer() {
  const { endpoint, mode } = useClashEndpoint()
  const { all } = useServers()
  const activeTag = shallowRef<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  watch(
    [endpoint, mode],
    ([current, currentMode]) => {
      if (timer) clearInterval(timer)
      timer = null
      activeTag.value = null
      if (!current || currentMode !== 'auto') return

      const poll = () =>
        clashGroupNow(current, TAG.proxy).then(
          (tag) => (activeTag.value = tag),
          () => undefined,
        )
      void poll()
      timer = setInterval(poll, POLL_MS)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    if (timer) clearInterval(timer)
  })

  const activeServerName = computed(
    () => all.value.find((s) => serverTag(s.id) === activeTag.value)?.server.name ?? null,
  )
  return { activeServerName }
}
