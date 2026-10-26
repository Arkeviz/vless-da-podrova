import { useStorageItem } from '@/common/storage/useStorageItem'
import { alwaysSitesItem, learnedDomainsItem, learnIgnoreItem, tabModeTabsItem } from '../model/storage'

export function useTabMode() {
  const { value: tabIds } = useStorageItem(tabModeTabsItem)
  const { value: alwaysSites } = useStorageItem(alwaysSitesItem)
  const { value: learned } = useStorageItem(learnedDomainsItem)
  const { value: ignore } = useStorageItem(learnIgnoreItem)
  return { tabIds, alwaysSites, learned, ignore }
}
