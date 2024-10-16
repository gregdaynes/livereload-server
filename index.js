import url from 'node:url'
import { open } from 'node:fs/promises'
import { watch } from 'node:fs'
import { createServer } from 'node:http'
import Path from 'node:path'
import mime from 'mime-types'
import { WebSocketServer } from 'ws'

export default server
export {
  server,
  listen
}

/**
 * If the script is run directly, start the server
 * @example
 *  $ node index.js
 */
if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url)

  if (process.argv[1] === modulePath) listen()
}

/**
 * Create an HTTP server
 * @returns {http.Server}
 */
function server () {
  return createServer((req, res) => handleUrl(req, res))
}

/**
 * Start the server
 * @param {number} port - The port to listen on
 * @returns {object} - The server instance
 * @returns {boolean} listening - Whether the server is listening
 * @returns {function} close - Close the server
 * @example
 *  const instance = await listen(3000)
 *  instance.close()
 */
function listen (port = 3000) {
  const instance = server()
  const wss = createWebSocketServer(instance)
  const fileChanged = sendLiveReloadCommand.bind(null, wss)

  const watcher = watch(import.meta.dirname, (eventType, filename) => {
    if (eventType === 'change') {
      // TODO replace / + filename with something more robust.
      fileChanged('reload', '/' + filename)
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

/**
  * Send a live reload command to all clients
  * @param {WebSocketServer} wss - The WebSocket server
  * @param {string} command - The command to send
  * @param {string} path - The path to send
  * @returns {void}
  * @example
  *  sendLiveReloadCommand(wss, 'reload', 'style.css')
  */
function sendLiveReloadCommand (wss, command, path) {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({
      command,
      path,
      liveCSS: true,
    }))
  })
}

/**
 * Create a WebSocket server
 * @param {http.Server} server - The HTTP server instance to bind on
 * @returns {WebSocketServer} - The WebSocket server
 * @example
 *  const wss = createWebSocketServer(server)
 */
function createWebSocketServer (server) {
  const wss = new WebSocketServer({ server })

  wss.on('connection', function connection (ws) {
    ws.on('error', console.error)
    ws.on('message', handleOnMessage)
  })

  return wss
}

/**
  * Handle a WebSocket message
  * @this {WebSocket} - The WebSocket instance
  * @param {Buffer} data - The data to parse
  * @returns {void}
  * @example
  *  handleOnMessage(Buffer.from('{"command":"hello"}'))
  */
function handleOnMessage (data) {
  const message = JSON.parse(data.toString())

  if (message.command === 'hello') {
    const data = JSON.stringify(livereloadGreet())

    return this.send(data)
  }
}

/**
 * Generate a livereload greet message
 * @returns {object} - The livereload greet message
 * @example
 *  const message = livereloadGreet()
 */
function livereloadGreet () {
  return {
    command: 'hello',
    protocols: [
      'http://livereload.com/protocols/official-7',
      'http://livereload.com/protocols/official-8',
      'http://livereload.com/protocols/official-9',
      'http://livereload.com/protocols/2.x-origin-version-negotiation',
      'http://livereload.com/protocols/2.x-remote-control'],
    serverName: 'my-server',
  }
}

/**
 * Handle a URL request
 * @description Will always reject favicon requests
 * @param {http.IncomingMessage} req - The request object
 * @param {string} req.url - The request URL
 * @param {http.ServerResponse} res - The response object
 * @returns {void}
 */
async function handleUrl (req, res) {
  if (req.url === '/favicon.ico') return res.end()

  const { filepath, type } = parseRequest(req)

  try {
    const fd = await open(filepath)

    res.writeHead(200, { 'Content-Type': type })

    // html files get buffered, then modified with livereload script
    if (type === 'text/html') {
      res.write(await getHtmlBody(fd))
    } else {
      // non html files get streamed from read
      for await (const chunk of fd.readableWebStream()) {
        res.write(Buffer.from(chunk))
      }
    }

    await fd.close()
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404)
      return res.end()
    }

    console.log(err)
    throw new Error(err)
  }

  res.end()
}

/**
  * Parse a request
  * @param {http.IncomingMessage} req - The request object
  * @param {string} req.url - The request URL
  * @returns {object} - The parsed request object
  * @returns {string} filepath - The file path
  * @returns {string} type - The MIME type
  * @example
  *  const { filepath, type } = parseRequest(req)
  *  // filepath = '/path/to/file.html'
  *  // type = 'text/html'
  */
function parseRequest (req) {
  let { url } = req

  url = url.split('?')[0]

  let filepath
  if (url === '/') {
    filepath = Path.join(import.meta.dirname, 'index.html')
  } else if (url === '/livereload.js') {
    filepath = Path.join(import.meta.dirname, import.meta.resolve('livereload-js').split(import.meta.dirname)[1])
  } else {
    filepath = Path.join(import.meta.dirname, url)
  }

  const extName = Path.extname(filepath)
  const type = mime.lookup(extName)

  return {
    filepath,
    type
  }
}

/**
 * Get the HTML body
 * @description Inject a livereload script into the HTML body
 * @param {fs.FileHandle} fd - The file descriptor
 * @returns {string} - The HTML body
 */
async function getHtmlBody (fd) {
  let html = ''

  const stream = await fd.createReadStream()
  for await (const chunk of stream) {
    html += chunk.toString()
  }

  if (html.includes('</body>')) {
    html = html.replace('</body>', `${generateLiveReloadScript()}</body>`)
  } else {
    html += generateLiveReloadScript()
  }

  return html
}

/**
 * Generate a livereload script
 * @param {number} port - The port to use
 * @returns {string} - The livereload script
 * @example
 *  const script = generateLiveReloadScript()
 */
function generateLiveReloadScript (port = 3000) {
  return `<script>
    document.write('<script src="http://'
      + (location.host || 'localhost').split(':')[0]
      + ':${port}/livereload.js"></'
      + 'script>')
    </script>`
}
