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

  t.after(() => instance.close())

  assert(instance.listening)
})

test('http server response', async (t) => {
  await t.test('root without content accept header', async () => {
    const { get } = await import('node:http')
    const { listen } = await import('./index.js')
    const instance = await listen(3002)

    await get('http://localhost:3002', async (res) => {
      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['content-type'], 'text/plain')

      const data = await parseResponse(res)
      assert.equal(data, 'Hello World')

      instance.close()
    })
  })

  await t.test('root with content accept html header', async () => {
    const { get } = await import('node:http')
    const { listen } = await import('./index.js')
    const instance = await listen(3003)

    await get('http://localhost:3003', { headers: { Accept: 'text/html' } }, async (res) => {
      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['content-type'], 'text/html')

      const data = await parseResponse(res)
      assert.equal(data, '<h1>Hello World</h1>')

      instance.close()
    })
  })
})

async function parseResponse (res) {
  const { promise, resolve, reject } = Promise.withResolvers()

  let data = ''

  res.setEncoding('utf8')
  res.on('data', (chunk) => { data += chunk })
  res.on('error', (err) => reject(err))
  res.on('end', () => {
    return resolve(data)
  })

  return promise
}
