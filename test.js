import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, } from 'node:crypto'
import { server } from './index.js'

test('HTTP Server', async (t) => {
  const { listen } = await import('./index.js')
  const instance = await listen(3000)

  t.after(() => instance.close())

  await t.test('http server', async () => {
    const http = await import('node:http')
    assert(server() instanceof http.Server)
  })

  await t.test('http server listening', async (t) => {
    assert(instance.listening)
  })

  await t.test('http server response', async (t) => {
    await t.test('root with content accept html header', async (t) => {
      const response = await fetch('http://localhost:3000')

      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), 'text/html')
      assert.equal((await getBody(response.body)).includes('<h1>Hello World</h1>\n'), true)
    })

    await t.test('request style.css', async (t) => {
      const response = await fetch('http://localhost:3000/style.css')

      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), 'text/css')
      assert.equal(await getBody(response.body), 'body {\n  color: red;\n}\n')
    })

    await t.test('request script.js', async (t) => {
      const response = await fetch('http://localhost:3000/script.js')

      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), 'application/javascript')
      assert.equal(await getBody(response.body), 'console.log(\'Hello World\')\n')
    })

    await t.test('favicon.ico', async (t) => {
      const response = await fetch('http://localhost:3000/favicon.ico')

      assert.equal(response.status, 200)
      assert.equal(await getBody(response.body), '')
    })

    await t.test('livereload.js', async (t) => {
      const response = await fetch('http://localhost:3000/livereload.js')

      assert.equal(response.status, 200)
      assert.equal(response.headers.get('content-type'), 'application/javascript')

      const hash = createHash('sha256')

      for await (const chunk of response.body) {
        const data = Buffer.from(chunk)
        hash.update(data)
      }

      // compare response file with known good hash
      assert.equal(hash.digest('hex'), 'e071a0325051d6bf19fc9c69c97cb7512e600a16e3f63fdd279cc39f72f9e488')
    })

    await t.test('path traversal', async (t) => {
      const response = await fetch('http://localhost:3000/../callable-instance.js')

      assert.equal(response.status, 404)
    })
  })

  async function getBody (body) {
    const bodyBuffer = await new Response(body).arrayBuffer()
    return Buffer.from(bodyBuffer).toString()
  }
})

test('WS Server', async (t) => {
  const { listen } = await import('./index.js')
  const instance = await listen(4000)

  t.after(() => instance.close())

  await t.test('ws server response', async (t) => {
    const controller = new AbortController()
    const signal = controller.signal

    const { promise, resolve } = Promise.withResolvers()

    const socket = new WebSocket('ws://localhost:4000')

    socket.addEventListener('open', (event) => {
      socket.send(JSON.stringify({ command: 'hello' }))
    }, { signal })

    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)

      assert.equal(data.command, 'hello')
      assert.ok(data.protocols.filter((entry) => {
        const versions = [
          'http://livereload.com/protocols/official-7',
          'http://livereload.com/protocols/official-8',
          'http://livereload.com/protocols/official-9',
          'http://livereload.com/protocols/2.x-origin-version-negotiation',
          'http://livereload.com/protocols/2.x-remote-control'
        ]

        return versions.includes(entry)
      }))
      socket.close()
      controller.abort()
      resolve()
    }, { signal })

    return promise
  })
})
