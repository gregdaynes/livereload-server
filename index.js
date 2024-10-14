import { createServer } from 'node:http'

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Hello World')
})

function listen () {
  return server.listen(8080)
}

export default server

export {
  server,
  listen
}
