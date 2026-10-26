import { normalizeDomain, toDomainSet, type DomainSet } from '@vdp/shared'
import { addRule } from '@/modules/routing'
import {
  activeSitesItem,
  alwaysSitesItem,
  learnedDomainsItem,
  learnIgnoreItem,
  tabModeTabsItem,
} from './storage'

export interface TabModeState {
  tabIds: number[]
  alwaysSites: DomainSet
  /**
   * Chromium: домены, которые PAC отправляет в прокси ради режима вкладки, — сайты вкладок
   * в режиме и сайты «всегда», вместе с выученными для них доменами.
   */
  forcedDomains: string[]
}

export async function getTabModeState(): Promise<TabModeState> {
  const [tabIds, activeSites, alwaysSites, learned] = await Promise.all([
    tabModeTabsItem.getValue(),
    activeSitesItem.getValue(),
    alwaysSitesItem.getValue(),
    learnedDomainsItem.getValue(),
  ])
  const forced = new Set<string>()
  for (const site of [...activeSites, ...alwaysSites]) {
    forced.add(site)
    for (const domain of learned[site] ?? []) forced.add(domain)
  }
  return { tabIds, alwaysSites: toDomainSet(alwaysSites), forcedDomains: [...forced].sort() }
}

export function watchTabMode(callback: () => void): () => void {
  const unwatchers = [tabModeTabsItem, activeSitesItem, alwaysSitesItem, learnedDomainsItem].map((item) =>
    item.watch(callback),
  )
  return () => unwatchers.forEach((unwatch) => unwatch())
}

export async function setTabMode(tabId: number, enabled: boolean): Promise<void> {
  const tabIds = await tabModeTabsItem.getValue()
  if (enabled === tabIds.includes(tabId)) return
  await tabModeTabsItem.setValue(enabled ? [...tabIds, tabId] : tabIds.filter((id) => id !== tabId))
}

export async function setAlwaysForSite(site: string, enabled: boolean): Promise<void> {
  const sites = (await alwaysSitesItem.getValue()).filter((s) => s !== site)
  await alwaysSitesItem.setValue(enabled ? [...sites, site].sort() : sites)
}

export async function removeLearnedDomain(site: string, domain: string): Promise<void> {
  const learned = await learnedDomainsItem.getValue()
  const rest = (learned[site] ?? []).filter((d) => d !== domain)
  await learnedDomainsItem.setValue({ ...learned, [site]: rest })
}

export async function forgetSite(site: string): Promise<void> {
  const { [site]: _forgotten, ...rest } = await learnedDomainsItem.getValue()
  await learnedDomainsItem.setValue(rest)
}

/** Превращает сайт и выученные для него домены в постоянные правила «через прокси». */
export async function learnedToRules(site: string): Promise<void> {
  const learned = (await learnedDomainsItem.getValue())[site] ?? []
  for (const domain of [site, ...learned]) {
    await addRule({ type: 'suffix', value: domain }, 'proxy')
  }
}

/** Бросает RuleValidationError на некорректный домен. */
export async function addIgnoredDomain(raw: string): Promise<void> {
  const domain = normalizeDomain(raw)
  const ignore = await learnIgnoreItem.getValue()
  if (!ignore.includes(domain)) await learnIgnoreItem.setValue([...ignore, domain].sort())
}

export async function removeIgnoredDomain(domain: string): Promise<void> {
  await learnIgnoreItem.setValue((await learnIgnoreItem.getValue()).filter((d) => d !== domain))
}
