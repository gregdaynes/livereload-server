import { test } from 'node:test'
import assert from 'node:assert/strict'

test('http server', async () => {
  const http = await import('node:http')
  const { server } = await import('./index.js')

  assert(server instanceof http.Server)
})

test('http server listening', async (t) => {
  const { listen } = await import('./index.js')
  const instance = await listen()

  t.after(() => instance.close())

  assert(instance.listening)
})

test('http server response', async (t) => {
  const { get } = await import('node:http')
  const { listen } = await import('./index.js')
  const instance = await listen()

  await get('http://localhost:8080', (res) => {
    assert.equal(res.statusCode, 200)
    assert.equal(res.headers['content-type'], 'text/plain')

    res.setEncoding('utf8')
    let data = ''
    res.on('data', (chunk) => data += chunk)
    res.on('end', () => {
      assert.equal(data, 'Hello World')
    })

    instance.close()
  })
})
 

