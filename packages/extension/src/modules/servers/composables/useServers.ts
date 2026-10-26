import { computed } from 'vue'
import { useStorageItem } from '@/common/storage/useStorageItem'
import { collectServers } from '../model/servers'
import { AUTO_SELECTION, selectedServerIdItem, serversItem, subscriptionsItem } from '../model/storage'

export function useServers() {
  const { value: manual } = useStorageItem(serversItem)
  const { value: subscriptions } = useStorageItem(subscriptionsItem)
  const { value: selectedId } = useStorageItem(selectedServerIdItem)

  const all = computed(() => collectServers(manual.value, subscriptions.value))
  const isAuto = computed(() => selectedId.value === AUTO_SELECTION)
  const selected = computed(() => all.value.find((s) => s.id === selectedId.value) ?? null)
  /** Есть с чем включаться: выбран сервер или «авто» при непустом списке. */
  const hasSelection = computed(() => selected.value !== null || (isAuto.value && all.value.length > 0))

  return { manual, subscriptions, all, selectedId, selected, isAuto, hasSelection }
}
