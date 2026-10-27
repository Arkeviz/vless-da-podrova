import { computed } from 'vue'
import { useActiveTab } from '@/common/browser/useActiveTab'
import { useStorageItem } from '@/common/storage/useStorageItem'
import { siteOf } from '@/common/utilities/site'
import { tabSites } from '../model/groups'
import { tabDomainsItem } from '../model/storage'

/** Сайты (регистрируемые домены), к которым обращалась активная вкладка; сайт страницы первым. */
export function useActiveTabSites() {
  const { tab } = useActiveTab()
  const { value: stored } = useStorageItem(tabDomainsItem)

  const sites = computed(() =>
    tab.value ? tabSites(stored.value[tab.value.id] ?? [], siteOf(tab.value.host), siteOf) : [],
  )
  return { sites }
}
