import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { setSiteRules } from './rules'
import { browserRulesItem } from './storage'

const suffix = (value: string) => ({ type: 'suffix' as const, value })

beforeEach(() => {
  fakeBrowser.reset()
})

describe('правила для нескольких доменов', () => {
  it('ставит, заменяет и снимает правила одной записью', async () => {
    await browserRulesItem.setValue([
      { id: 'keep', match: suffix('youtube.com'), action: 'proxy' },
      { id: 'old', match: suffix('ozon.ru'), action: 'direct' },
    ])
    let writes = 0
    const unwatch = browserRulesItem.watch(() => writes++)

    await setSiteRules([suffix('ozon.ru'), suffix('ozone.ru'), suffix('ozonusercontent.com')], 'proxy')
    const afterSet = await browserRulesItem.getValue()
    expect(afterSet.map((r) => `${r.match.value}:${r.action}`)).toEqual([
      'youtube.com:proxy',
      'ozon.ru:proxy',
      'ozone.ru:proxy',
      'ozonusercontent.com:proxy',
    ])

    await setSiteRules([suffix('ozon.ru'), suffix('ozone.ru'), suffix('ozonusercontent.com')], null)
    expect((await browserRulesItem.getValue()).map((r) => r.match.value)).toEqual(['youtube.com'])

    await new Promise((resolve) => setTimeout(resolve, 0))
    unwatch()
    expect(writes).toBe(2)
  })
})
