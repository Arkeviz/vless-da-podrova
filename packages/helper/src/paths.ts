import { dirname, join } from 'node:path'

/**
 * Папка установки: рядом с exe хелпера лежит sing-box.exe.
 * При запуске из исходников (`bun src/main.ts`) её задают через VDP_INSTALL_DIR.
 */
export const installDir = process.env.VDP_INSTALL_DIR ?? dirname(process.execPath)

export const corePath = join(installDir, 'sing-box.exe')
export const runDir = join(installDir, 'run')
export const helperLogPath = join(installDir, 'helper.log')

/** У каждого браузера свой экземпляр хелпера - конфиги не должны пересекаться. */
export const configPath = join(runDir, `config-${process.pid}.json`)
