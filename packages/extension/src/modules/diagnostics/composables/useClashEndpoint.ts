import type { ClashEndpoint } from '@vdp/shared'
import { computed } from 'vue'
import { useConnection } from '@/modules/connection'

/** Адрес Clash API запущенного ядра; null, пока прокси не подключён. */
export function useClashEndpoint() {
  const { status } = useConnection()
  const endpoint = computed<ClashEndpoint | null>(() =>
    status.value.state === 'on'
      ? { port: status.value.ports.clashApi, secret: status.value.clashApiSecret }
      : null,
  )
  const mode = computed(() => (status.value.state === 'on' ? status.value.mode : null))
  return { endpoint, mode }
}
