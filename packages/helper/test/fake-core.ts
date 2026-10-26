/**
 * Подмена sing-box для smoke-теста хелпера: `version` печатает версию,
 * `run -c <config>` слушает порт первого inbound и, если задано, падает через crashAfterMs.
 */
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'

const [command, , configPath] = process.argv.slice(2)

if (command === 'version') {
  console.log('sing-box version 0.0.0-fake')
  process.exit(0)
}

const config = JSON.parse(readFileSync(configPath!, 'utf8'))
const port = config.inbounds[0].listen_port
createServer((socket) => socket.end()).listen(port, '127.0.0.1', () => {
  console.error(`fake core listening on ${port}`)
})
if (config.crashAfterMs) {
  setTimeout(() => {
    console.error('fake core crashing')
    process.exit(3)
  }, config.crashAfterMs)
}
