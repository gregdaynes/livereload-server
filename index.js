import { createServer } from 'node:http'
// import { WebSocketServer } from 'ws'

function server () {
  return createServer((req, res) => {
    const { url, headers } = req

    if (url === '/' && !headers['accept']) {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('Hello World')
    }

    if (url === '/' && headers['accept'] === 'text/html') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<h1>Hello World</h1>')
    }
  })
}

function listen (port = 3000) {
  return server().listen(port)
}

export default server

export {
  server,
  listen
}
