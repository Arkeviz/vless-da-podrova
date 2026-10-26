import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import {
  activeSitesItem,
  alwaysSitesItem,
  learnedDomainsItem,
  learnIgnoreItem,
  tabModeTabsItem,
} from '../model/storage'
import { getTabModeState, setTabMode } from '../model/tab-mode'
import { TabModeController } from './controller'

const request = (tabId: number, url: string, type = 'xmlhttprequest') => ({ tabId, url, type })

async function startController() {
  const controller = new TabModeController()
  await controller.start()
  return controller
}

beforeEach(() => {
  fakeBrowser.reset()
})

describe('режим вкладки: фон', () => {
  it('выучивает домены вкладки для её сайта, пропуская свой сайт, локальные адреса и игнор', async () => {
    await learnIgnoreItem.setValue(['google.com'])
    const controller = await startController()
    controller.onRequest(request(7, 'https://www.twitch.tv/streamer', 'main_frame'))
    await setTabMode(7, true)
    await vi.waitFor(async () => expect(await activeSitesItem.getValue()).toEqual(['twitch.tv']))

    for (const url of [
      'https://usher.ttvnw.net/api/channel.m3u8',
      'https://video-edge-1.abs.hls.ttvnw.net/v1/segment.ts',
      'https://cdn.7tv.app/emote/1x.webp',
      'https://gql.twitch.tv/gql',
      'https://www.google.com/recaptcha',
      'http://localhost:8080/',
    ]) {
      controller.onRequest(request(7, url))
    }
    // Другая вкладка не в режиме — её запросы не учатся.
    controller.onRequest(request(8, 'https://example.org/'))

    await vi.waitFor(async () => expect(await learnedDomainsItem.getValue()).toEqual({ 'twitch.tv': ['7tv.app', 'ttvnw.net'] }), {
      timeout: 3000,
    })
  })

  it('дочерние вкладки наследуют режим', async () => {
    const controller = await startController()
    await setTabMode(7, true)
    await vi.waitFor(() => expect(controller['tabIds'].has(7)).toBe(true))

    controller.onTabCreated({ id: 9, openerTabId: 7 })
    controller.onTabCreated({ id: 10, openerTabId: 3 })
    await vi.waitFor(async () => expect(await tabModeTabsItem.getValue()).toEqual([7, 9]))
  })

  it('«всегда для сайта» включает режим при переходе на сайт, закрытие вкладки — выключает', async () => {
    await alwaysSitesItem.setValue(['kick.com'])
    const controller = await startController()

    controller.onTabUrl(11, 'https://kick.com/some_streamer')
    controller.onTabUrl(12, 'https://youtube.com/')
    await vi.waitFor(async () => expect(await tabModeTabsItem.getValue()).toEqual([11]))

    controller.onTabRemoved(11)
    await vi.waitFor(async () => expect(await tabModeTabsItem.getValue()).toEqual([]))
  })

  it('принудительные домены — сайты вкладок в режиме и «всегда» вместе с выученным', async () => {
    await activeSitesItem.setValue(['twitch.tv'])
    await alwaysSitesItem.setValue(['kick.com'])
    await learnedDomainsItem.setValue({ 'twitch.tv': ['ttvnw.net'], 'kick.com': ['kickcdn.example'], 'other.org': ['x.net'] })

    expect((await getTabModeState()).forcedDomains).toEqual(['kick.com', 'kickcdn.example', 'ttvnw.net', 'twitch.tv'])
  })
})
