import { computed } from 'vue'
import { useActiveTab } from '@/common/browser/useActiveTab'
import { useTabMode } from './useTabMode'

/** Включён ли режим «вкладка через прокси» у активной вкладки. */
export function useActiveTabMode() {
  const { tab } = useActiveTab()
  const { tabIds } = useTabMode()
  const enabled = computed(() => tab.value !== null && tabIds.value.includes(tab.value.id))
  return { enabled }
}
