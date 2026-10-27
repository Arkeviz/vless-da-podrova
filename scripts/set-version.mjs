// Единая релизная версия живёт в корневом package.json: из него её берут манифест расширения и хелпер.
// Использование: pnpm version:set 0.3.0
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const next = process.argv[2]
if (!next || !/^\d+\.\d+\.\d+$/.test(next)) {
  console.error('Укажите версию вида 1.2.3: pnpm version:set 0.3.0')
  process.exit(1)
}

const path = fileURLToPath(new URL('../package.json', import.meta.url))
const root = JSON.parse(readFileSync(path, 'utf8'))
root.version = next
writeFileSync(path, `${JSON.stringify(root, null, 2)}\n`)
console.log(`Версия ${next}`)
