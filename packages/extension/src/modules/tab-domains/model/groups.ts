import type { BrowserVerdict } from '@vdp/shared'

export type DomainVerdict = BrowserVerdict | 'tab' | 'mixed'

export interface DomainGroup {
  /** Регистрируемый домен — по нему ставится правило «домен и поддомены». */
  site: string
  hosts: string[]
  verdict: DomainVerdict
}

/**
 * Группирует хосты вкладки по сайтам: сначала сайт самой страницы, потом по числу хостов.
 * `siteOf` и `verdictOf` передаются снаружи — так функция чистая и тестируется без браузера.
 */
export function groupHosts(
  hosts: readonly string[],
  pageSite: string | null,
  siteOf: (host: string) => string,
  verdictOf: (host: string) => DomainVerdict,
): DomainGroup[] {
  const bySite = new Map<string, string[]>()
  for (const host of hosts) {
    const site = siteOf(host)
    const list = bySite.get(site)
    if (list) list.push(host)
    else bySite.set(site, [host])
  }

  const groups = [...bySite].map(([site, siteHosts]): DomainGroup => {
    const verdicts = new Set(siteHosts.map(verdictOf))
    return {
      site,
      hosts: siteHosts.sort(),
      verdict: verdicts.size === 1 ? [...verdicts][0]! : 'mixed',
    }
  })

  return groups.sort(
    (a, b) =>
      Number(b.site === pageSite) - Number(a.site === pageSite) ||
      b.hosts.length - a.hosts.length ||
      a.site.localeCompare(b.site),
  )
}
