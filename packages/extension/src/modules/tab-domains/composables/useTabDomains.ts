import { browserVerdict, compileDomainRules } from '@vdp/shared'
import { computed, type Ref } from 'vue'
import { useStorageItem } from '@/common/storage/useStorageItem'
import { siteOf } from '@/common/utilities/site'
import { useRouting } from '@/modules/routing'
import { useTabMode } from '@/modules/tab-mode'
import { groupHosts, type DomainVerdict } from '../model/groups'
import { tabDomainsItem } from '../model/storage'

/** Хосты вкладки, сгруппированные по сайтам, с тем, как каждый сейчас идёт. */
export function useTabDomains(tab: Ref<{ id: number; host: string } | null>) {
  const { value: stored } = useStorageItem(tabDomainsItem)
  const { browserRules, coreRules, defaultAction } = useRouting()
  const { tabIds, forcedDomains } = useTabMode()

  const table = computed(() => compileDomainRules(browserRules.value))
  const inTabMode = computed(() => tab.value !== null && tabIds.value.includes(tab.value.id))

  const groups = computed(() => {
    if (!tab.value) return []
    const hosts = stored.value[tab.value.id] ?? []
    const verdictOf = (host: string): DomainVerdict =>
      inTabMode.value
        ? 'tab'
        : browserVerdict(host, {
            domainRules: table.value,
            forcedProxy: forcedDomains.value,
            hasCoreRules: coreRules.value.length > 0,
            defaultAction: defaultAction.value,
          })
    return groupHosts(hosts, siteOf(tab.value.host), siteOf, verdictOf)
  })

  const hostCount = computed(() => groups.value.reduce((sum, g) => sum + g.hosts.length, 0))

  return { groups, hostCount }
}
