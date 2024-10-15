import url from 'node:url'
import { createServer } from 'node:http'

function server () {
  return createServer((req, res) => {
    const { url, headers } = req

    if (url === '/' && headers.accept === 'text/plain') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
      return
    }

    if (url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.write('<h1>Hello World</h1>')
      res.end()
    }
  })
}

function listen (port = 3000) {
  const instance = server()
  instance.listen(port)

  return {
    listening: instance.listening,
    close () {
      const { promise, resolve, reject } = Promise.withResolvers()

      try {
        instance.close(() => {
          resolve()
        })

        return promise
      } catch (err) {
        reject(err)
      }
    }
  }
}

if (import.meta.url.startsWith('file:')) { // (A)
  const modulePath = url.fileURLToPath(import.meta.url)

  if (process.argv[1] === modulePath) { // (B)
    listen()
  }
}

export default server

export {
  server,
  listen
}
