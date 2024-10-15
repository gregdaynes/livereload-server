import url from 'node:url'
import { open } from 'node:fs/promises'
import { createServer } from 'node:http'
import Path from 'node:path'
import mime from 'mime-types'

function server () {
  return createServer(async (req, res) => {
    const { url, headers } = req

    if (url === '/' && headers.accept === 'text/plain') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
      return
    }

    if (url === '/') {
      req.url = '/index.html'
    }

    if (url === '/favicon.ico') {
      return res.end()
    }

    return handleUrl(req, res)
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

async function handleUrl (req, res) {
  const { url } = req

  const filepath = Path.join(import.meta.dirname, url)
  const extName = Path.extname(filepath)
  const type = mime.lookup(extName)

  try {
    const fd = await open(filepath)

    res.writeHead(200, { 'Content-Type': type })
    for await (const chunk of fd.readableWebStream()) {
      res.write(Buffer.from(chunk))
    }

    await fd.close()
  } catch (err) {
    res.writeHead(404)
  }

  res.end()
}
