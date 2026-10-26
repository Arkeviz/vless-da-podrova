import { computed } from 'vue'
import { useStorageItem } from '@/common/storage/useStorageItem'
import { DEFAULT_SETTINGS, settingsItem, type Settings } from '../model/settings'

export function useSettings() {
  const { value: stored, loaded } = useStorageItem(settingsItem)
  const settings = computed<Settings>(() => ({ ...DEFAULT_SETTINGS, ...stored.value }))
  return { settings, loaded }
}
