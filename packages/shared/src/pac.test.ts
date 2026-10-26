import { describe, expect, it } from 'vitest'
import { buildPacScript, isBypassedHost } from './pac'

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
  const pac = buildPacScript({ autoPort: 20001 })
  const findProxy = new Function(`${pac}; return FindProxyForURL`)() as (url: string, host: string) => string

  it.each(bypassed)('DIRECT для %s', (host) => expect(findProxy(`http://${host}/`, host)).toBe('DIRECT'))
  it.each(proxied)('SOCKS5 для %s', (host) =>
    expect(findProxy(`https://${host}/`, host)).toBe('SOCKS5 127.0.0.1:20001'),
  )
})
