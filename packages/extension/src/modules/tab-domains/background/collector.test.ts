import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { tabDomainsItem } from '../model/storage'
import { TabDomainsCollector } from './collector'

const request = (tabId: number, url: string, type = 'xmlhttprequest') => ({ tabId, url, type })

beforeEach(() => {
  fakeBrowser.reset()
})

describe('сбор доменов вкладки', () => {
  it('копит уникальные хосты, пропуская локальные адреса и фоновые запросы', async () => {
    const collector = new TabDomainsCollector()
    await collector.start()
    collector.onRequest(request(7, 'https://www.twitch.tv/x', 'main_frame'))
    collector.onRequest(request(7, 'https://gql.twitch.tv/gql'))
    collector.onRequest(request(7, 'https://GQL.twitch.tv/gql'))
    collector.onRequest(request(7, 'http://192.168.1.1/'))
    collector.onRequest(request(-1, 'https://update.example.com/'))
    await collector.flush()

    expect(await tabDomainsItem.getValue()).toEqual({ 7: ['www.twitch.tv', 'gql.twitch.tv'] })
  })

  it('новая загрузка страницы начинает список заново, закрытие вкладки — удаляет', async () => {
    const collector = new TabDomainsCollector()
    await collector.start()
    collector.onRequest(request(7, 'https://a.example.com/', 'main_frame'))
    collector.onRequest(request(7, 'https://cdn.example.net/'))
    collector.onRequest(request(8, 'https://b.example.org/', 'main_frame'))
    await collector.flush()

    collector.onRequest(request(7, 'https://other.site/', 'main_frame'))
    collector.onTabRemoved(8)
    await collector.flush()

    expect(await tabDomainsItem.getValue()).toEqual({ 7: ['other.site'] })
  })

  it('после перезапуска фона продолжает сохранённые списки', async () => {
    await tabDomainsItem.setValue({ 7: ['www.twitch.tv'] })
    const collector = new TabDomainsCollector()
    await collector.start()
    collector.onRequest(request(7, 'https://usher.ttvnw.net/'))
    await collector.flush()

    expect(await tabDomainsItem.getValue()).toEqual({ 7: ['www.twitch.tv', 'usher.ttvnw.net'] })
  })
})
