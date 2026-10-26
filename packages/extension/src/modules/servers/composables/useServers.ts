import { computed } from 'vue'
import { useStorageItem } from '@/common/storage/useStorageItem'
import { selectedServerIdItem, serversItem } from '../model/storage'

export function useServers() {
  const { value: servers } = useStorageItem(serversItem)
  const { value: selectedId } = useStorageItem(selectedServerIdItem)

  const selected = computed(() => servers.value.find((s) => s.id === selectedId.value) ?? null)

  return { servers, selectedId, selected }
}
