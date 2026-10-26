import { connect, createServer, type Server } from 'node:net'

/** Берёт у ОС свободные порты на 127.0.0.1: слушает порт 0 и сразу освобождает. */
export async function allocatePorts(count: number): Promise<number[]> {
  const servers: Server[] = []
  try {
    for (let i = 0; i < count; i++) {
      const server = createServer()
      servers.push(server)
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
      })
    }
    return servers.map((server) => {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Не удалось получить порт')
      return address.port
    })
  } finally {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))))
  }
}

export function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}
