import { describe, expect, it } from 'vitest'
import { siteOf } from '@/common/utilities/site'
import { groupHosts, tabSites, type DomainVerdict } from './groups'

describe('groupHosts', () => {
  const hosts = [
    'cdn.7tv.app',
    'gql.twitch.tv',
    'video-edge-1.abs.hls.ttvnw.net',
    'www.twitch.tv',
    'usher.ttvnw.net',
    'static.twitchcdn.net',
    'passport.twitch.tv',
  ]
  const verdictOf = (host: string): DomainVerdict =>
    host.endsWith('ttvnw.net') || host === 'www.twitch.tv' ? 'proxy' : 'core'

  it('группирует по сайтам: сайт страницы первым, дальше по числу хостов', () => {
    const groups = groupHosts(hosts, 'twitch.tv', siteOf, verdictOf)
    expect(groups.map((g) => [g.site, g.hosts.length, g.verdict])).toEqual([
      ['twitch.tv', 3, 'mixed'],
      ['ttvnw.net', 2, 'proxy'],
      ['7tv.app', 1, 'core'],
      ['twitchcdn.net', 1, 'core'],
    ])
    expect(groups[0]!.hosts).toEqual(['gql.twitch.tv', 'passport.twitch.tv', 'www.twitch.tv'])
  })
})

describe('tabSites', () => {
  it('сайт страницы первым, остальные уникальны и по алфавиту', () => {
    const hosts = ['www.ozon.ru', 'cdn1.ozone.ru', 'ir.ozone.ru', 'api.ozon.ru', 'st.ozonusercontent.com', 'mc.yandex.ru']
    expect(tabSites(hosts, 'ozon.ru', siteOf)).toEqual(['ozon.ru', 'ozone.ru', 'ozonusercontent.com', 'yandex.ru'])
  })

  it('сайт страницы есть, даже если запросов ещё не видно', () => {
    expect(tabSites([], 'ozon.ru', siteOf)).toEqual(['ozon.ru'])
  })
})
