import { test } from 'node:test'
import assert from 'node:assert/strict'

test('http server', async () => {
  const http = await import('node:http')
  const { server } = await import('./index.js')

  assert(server() instanceof http.Server)
})

test('http server listening', async (t) => {
  const { listen } = await import('./index.js')
  const instance = await listen(3001)

  assert(instance.listening)

  instance.close()
})

test('http server response', async (t) => {
  await t.test('root without content accept header', async (t) => {
    const { listen } = await import('./index.js')
    const instance = await listen(3002)

    const response = await fetch('http://localhost:3002', {
      headers: {
        Accept: 'text/plain'
      }
    })

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'text/plain')
    assert.equal(await getBody(response.body), 'Hello World')

    instance.close()
  })

  await t.test('root with content accept html header', async (t) => {
    const { listen } = await import('./index.js')
    const instance = await listen(3003)

    const response = await fetch('http://localhost:3003')

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'text/html')
    assert.equal(await getBody(response.body), '<h1>Hello World</h1>\n')

    instance.close()
  })

  await t.test('request style.css', async (t) => {
    const { listen } = await import('./index.js')
    const instance = await listen(3004)

    const response = await fetch('http://localhost:3004/style.css')

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'text/css')
    assert.equal(await getBody(response.body), 'body {\n  color: red;\n}\n')

    instance.close()
  })

  await t.test('request script.js', async (t) => {
    const { listen } = await import('./index.js')
    const instance = await listen(3005)

    const response = await fetch('http://localhost:3005/script.js')

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/javascript')
    assert.equal(await getBody(response.body), 'window.alert(\'Hello World\')\n')

    instance.close()
  })

  await t.test('favicon.ico ', async (t) => {
    const { listen } = await import('./index.js')
    const instance = await listen(3006)

    const response = await fetch('http://localhost:3006/favicon.ico')

    assert.equal(response.status, 200)
    assert.equal(await getBody(response.body), '')

    instance.close()
  })

  await t.test('path traversal', async (t) => {
    const { listen } = await import('./index.js')
    const instance = await listen(3007)

    const response = await fetch('http://localhost:3007/../callable-instance.js')

    assert.equal(response.status, 404)

    instance.close()
  })
})

async function getBody (body) {
  const bodyBuffer = await new Response(body).arrayBuffer()
  return Buffer.from(bodyBuffer).toString()
}
