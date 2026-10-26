import { describe, expect, it } from 'vitest'
import { buildPacScript, isBypassedHost, resolveBrowserRoute } from './pac'
import { compileDomainRules } from './rules'

const bypassed = [
  'localhost',
  'intranet',
  'app.localhost',
  '127.0.0.1',
  '10.1.2.3',
  '172.16.0.1',
  '172.31.255.255',
  '192.168.1.1',
  '169.254.10.10',
  '::1',
  '[::1]',
  'fd12:3456::1',
  'fe80::1',
]
const proxied = ['twitch.tv', 'www.youtube.com', '8.8.8.8', '172.32.0.1', '192.169.0.1', '2001:db8::1']

describe('isBypassedHost', () => {
  it.each(bypassed)('мимо прокси: %s', (host) => expect(isBypassedHost(host)).toBe(true))
  it.each(proxied)('через прокси: %s', (host) => expect(isBypassedHost(host)).toBe(false))
})

describe('buildPacScript', () => {
  const domainRules = compileDomainRules([
    { id: '1', match: { type: 'suffix', value: 'twitch.tv' }, action: 'proxy' },
    { id: '2', match: { type: 'exact', value: 'www.youtube.com' }, action: 'direct' },
    { id: '3', match: { type: 'keyword', value: '7tv' }, action: 'proxy' },
  ])
  const pac = buildPacScript({ autoPort: 20001, proxyPort: 20002, domainRules })
  const findProxy = new Function(`${pac}; return FindProxyForURL`)() as (url: string, host: string) => string

  it.each(bypassed)('DIRECT для %s', (host) => expect(findProxy(`http://${host}/`, host)).toBe('DIRECT'))
  it.each(['8.8.8.8', '172.32.0.1', 'example.org'])('по правилам ядра: %s', (host) =>
    expect(findProxy(`https://${host}/`, host)).toBe('SOCKS5 127.0.0.1:20001'),
  )

  const expectedByRoute = {
    direct: 'DIRECT',
    proxy: 'SOCKS5 127.0.0.1:20002',
    auto: 'SOCKS5 127.0.0.1:20001',
  }
  it.each(['twitch.tv', 'usher.twitch.tv', 'www.youtube.com', 'm.youtube.com', 'cdn.7tv.app', '10.0.0.1', 'ya.ru'])(
    'PAC и resolveBrowserRoute согласны: %s',
    (host) => {
      expect(findProxy(`https://${host}/`, host)).toBe(expectedByRoute[resolveBrowserRoute(host, domainRules)])
    },
  )

  it('доменные правила срабатывают', () => {
    expect(resolveBrowserRoute('usher.twitch.tv', domainRules)).toBe('proxy')
    expect(resolveBrowserRoute('www.youtube.com', domainRules)).toBe('direct')
    expect(resolveBrowserRoute('ya.ru', domainRules)).toBe('auto')
  })
})
