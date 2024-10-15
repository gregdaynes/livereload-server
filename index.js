import url from 'node:url'
import { open } from 'node:fs/promises'
import { watch } from 'node:fs'
import { createServer } from 'node:http'
import Path from 'node:path'
import mime from 'mime-types'
import { WebSocketServer } from 'ws'

function server () {
  return createServer((req, res) => handleUrl(req, res))
}

function listen (port = 3000) {
  const instance = server()

  const wss = new WebSocketServer({ server: instance })

  wss.on('connection', function connection (ws) {
    ws.on('error', console.error)

    ws.on('message', function message (data) {
      const message = JSON.parse(data.toString())

      if (message.command === 'hello') {
        const data = JSON.stringify({
          command: 'hello',
          protocols: [
            'http://livereload.com/protocols/official-7',
            'http://livereload.com/protocols/official-8',
            'http://livereload.com/protocols/official-9',
            'http://livereload.com/protocols/2.x-origin-version-negotiation',
            'http://livereload.com/protocols/2.x-remote-control'],
          serverName: 'my-server',
        })

        return ws.send(data)
      }
    })
  })

  function sendLiveReloadCommand (command, path) {
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({
        command,
        path,
        liveCSS: true,
      }))
    })
  }

  const watcher = watch(import.meta.dirname, (eventType, filename) => {
    if (eventType === 'change') {
      sendLiveReloadCommand('reload', '/' + filename)
    }
  })

  instance.listen(port)

  return {
    listening: instance.listening,
    close () {
      wss.close()
      watcher.close()
      instance.close()
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
  let { url } = req

  url = url.split('?')[0]

  let filepath
  if (url === '/') {
    filepath = Path.join(import.meta.dirname, 'index.html')
  } else if (url === '/favicon.ico') {
    return res.end()
  } else if (url === '/livereload.js') {
    filepath = Path.join(import.meta.dirname, import.meta.resolve('livereload-js').split(import.meta.dirname)[1])
  } else {
    filepath = Path.join(import.meta.dirname, url)
  }

  const extName = Path.extname(filepath)
  const type = mime.lookup(extName)

  try {
    const fd = await open(filepath)

    res.writeHead(200, { 'Content-Type': type })

    if (type === 'text/html') {
      // html files get buffered, then modified with livereload script
      let html = ''
      for await (const chunk of fd.readableWebStream()) {
        html += Buffer.from(chunk).toString()
      }

      if (html.includes('</body>')) {
        html = html.replace('</body>', `${generateLiveReloadScript()}</body>`)
      } else {
        html += generateLiveReloadScript()
      }

      res.write(html)
    } else {
      // non html files get streamed from read
      for await (const chunk of fd.readableWebStream()) {
        res.write(Buffer.from(chunk))
      }
    }

    await fd.close()
  } catch (err) {
    res.writeHead(404)
  }

  res.end()
}

function generateLiveReloadScript (port = 3000) {
  return `<script>
    document.write('<script src="http://'
      + (location.host || 'localhost').split(':')[0]
      + ':${port}/livereload.js"></'
      + 'script>')
    </script>`
}
