import { parse } from 'tldts'

/** «Сайт» хоста: регистрируемый домен (youtube.com для music.youtube.com), для IP — сам хост. */
export function siteOf(host: string): string {
  const parsed = parse(host)
  return parsed.isIp || !parsed.domain ? host.toLowerCase() : parsed.domain
}
