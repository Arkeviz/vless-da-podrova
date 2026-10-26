import { useStorageItem } from '@/common/storage/useStorageItem'
import { toDomainSet, type DomainSet } from '@vdp/shared'
import { computed } from 'vue'
import { computeForcedDomains } from '../model/tab-mode'
import {
  activeSitesItem,
  alwaysSitesItem,
  learnedDomainsItem,
  learnIgnoreItem,
  tabModeTabsItem,
} from '../model/storage'

export function useTabMode() {
  const { value: tabIds } = useStorageItem(tabModeTabsItem)
  const { value: alwaysSites } = useStorageItem(alwaysSitesItem)
  const { value: learned } = useStorageItem(learnedDomainsItem)
  const { value: ignore } = useStorageItem(learnIgnoreItem)
  const { value: activeSites } = useStorageItem(activeSitesItem)

  /** Chromium: домены, которые PAC сейчас отправляет в прокси ради режима вкладки. */
  const forcedDomains = computed<DomainSet>(() =>
    import.meta.env.FIREFOX
      ? {}
      : toDomainSet(computeForcedDomains(activeSites.value, alwaysSites.value, learned.value)),
  )

  return { tabIds, alwaysSites, learned, ignore, forcedDomains }
}
