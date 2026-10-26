/**
 * Подпись Firefox-сборки через AMO в канале unlisted: в каталоге расширение не появляется,
 * а подписанный .xpi ставится в обычный Firefox навсегда.
 *
 * Нужны ключи API AMO (https://addons.mozilla.org/developers/addon/api/key/):
 *   WEB_EXT_API_KEY=user:… WEB_EXT_API_SECRET=… pnpm --filter @vdp/extension sign:firefox
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB_EXT_VERSION = '10.8.0'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string }

if (!process.env.WEB_EXT_API_KEY || !process.env.WEB_EXT_API_SECRET) {
  console.error(
    'Задайте WEB_EXT_API_KEY и WEB_EXT_API_SECRET — ключи API AMO:\n' +
      '  https://addons.mozilla.org/developers/addon/api/key/',
  )
  process.exit(1)
}

const run = (command: string) => execSync(command, { cwd: root, stdio: 'inherit' })

// Сборка + архив исходников от корня монорепо (AMO просит их для собранного кода).
run('pnpm wxt zip -b firefox')
run(
  [
    `pnpm dlx web-ext@${WEB_EXT_VERSION} sign`,
    '--channel=unlisted',
    '--source-dir=.output/firefox-mv2',
    `--upload-source-code=.output/vdpextension-${version}-sources.zip`,
    '--artifacts-dir=.output/signed',
  ].join(' '),
)
console.log('Подписанный .xpi — в packages/extension/.output/signed')
