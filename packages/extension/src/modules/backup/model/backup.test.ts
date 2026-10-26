import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { allBackupItems, BackupError, exportBackup, importBackup, parseBackup } from './backup'

const byKey = (key: string) => allBackupItems.find((item) => item.key === key)!

beforeEach(() => {
  fakeBrowser.reset()
})

describe('резервная копия', () => {
  it('сохраняет и восстанавливает все разделы', async () => {
    const rules = [{ id: 'r1', match: { type: 'suffix', value: 'twitch.tv' }, action: 'proxy' }]
    await byKey('local:browserRules').setValue(rules)
    await byKey('local:settings').setValue({ killSwitch: true })
    await byKey('local:tabModeAlwaysSites').setValue(['kick.com'])
    // null (ничего не выбрано) в копию не попадает — восстанавливать там нечего.
    await byKey('local:selectedServerId').setValue('server-1')

    const backup = await exportBackup(new Date('2026-10-26T12:00:00Z'))
    expect(backup).toMatchObject({ app: 'vless-da-podrova', version: 1, exportedAt: '2026-10-26T12:00:00.000Z' })
    expect(Object.keys(backup.data)).toEqual(allBackupItems.map((item) => item.key))

    fakeBrowser.reset()
    const sections = await importBackup(JSON.stringify(backup))
    expect(sections).toBe(allBackupItems.length)
    expect(await byKey('local:browserRules').getValue()).toEqual(rules)
    expect(await byKey('local:settings').getValue()).toEqual({ killSwitch: true })
    expect(await byKey('local:tabModeAlwaysSites').getValue()).toEqual(['kick.com'])
  })

  it('не трогает разделы, которых нет в файле, и игнорирует чужие ключи', async () => {
    await byKey('local:defaultAction').setValue('direct')
    const text = JSON.stringify({
      app: 'vless-da-podrova',
      version: 1,
      data: { 'local:coreRules': [], 'local:proxyEnabled': true, 'local:evil': 1 },
    })
    expect(await importBackup(text)).toBe(1)
    expect(await byKey('local:defaultAction').getValue()).toBe('direct')
  })

  it.each([
    ['не JSON', 'не json'],
    ['чужое приложение', JSON.stringify({ app: 'other', version: 1, data: {} })],
    ['новая версия', JSON.stringify({ app: 'vless-da-podrova', version: 99, data: { 'local:coreRules': [] } })],
    ['нет данных', JSON.stringify({ app: 'vless-da-podrova', version: 1, data: { 'local:unknown': 1 } })],
  ])('отклоняет: %s', (_, text) => {
    expect(() => parseBackup(text, ['local:coreRules'])).toThrow(BackupError)
  })
})
