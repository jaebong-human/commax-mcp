import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommaxApi } from '../src/api.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('CommaxApi.authenticate', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns access_token and gatewayNo on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        server: { iot: { ip: 'api.ruvie.co.kr', port: 4100 } },
        user: { resourceNo: 'gw-no-123' }
      })
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gateways: [{ gatewayNo: 'gw-no-123' }]
      })
    })

    const api = new CommaxApi('user', 'pass')
    await api.authenticate()
    expect(api.token).toBe('test-token')
    expect(api.gatewayNo).toBe('gw-no-123')
  })

  it('throws on auth failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid credentials' })
    })

    const api = new CommaxApi('bad', 'creds')
    await expect(api.authenticate()).rejects.toThrow('Auth failed: 401')
  })
})

describe('CommaxApi.listDevices', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns parsed device list', async () => {
    const api = new CommaxApi('user', 'pass')
    api.token = 'test-token'
    api.gatewayNo = 'gw-123'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gateway: {
          gatewayNo: 'gw-123',
          devices: {
            object: [
              {
                rootUuid: 'uuid-1',
                rootDevice: 'switch',
                nickname: '전등 01',
                visible: 'true',
                subDevice: [
                  { subUuid: 'sub-1', sort: 'switchBinary', value: 'on', type: 'readWrite' }
                ]
              },
              {
                rootUuid: 'uuid-2',
                rootDevice: 'switch',
                nickname: '숨김기기',
                visible: 'false',
                subDevice: []
              }
            ]
          }
        }
      })
    })

    const devices = await api.listDevices()
    expect(devices).toHaveLength(1)
    expect(devices[0].nickname).toBe('전등 01')
    expect(devices[0].subDevice[0].value).toBe('on')
  })
})

describe('CommaxApi.sendCommand', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends command with correct payload', async () => {
    const api = new CommaxApi('user', 'pass')
    api.token = 'test-token'
    api.gatewayNo = 'gw-123'

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    await api.sendCommand({
      rootUuid: 'uuid-1',
      rootDevice: 'switch',
      nickname: '전등 01',
      subDevice: [{ subUuid: 'sub-1', sort: 'switchBinary', value: 'on' }]
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.ruvie.co.kr:4100/v1/command')
    const body = JSON.parse(options.body)
    expect(body.commands.cgpCommand[0].cgp.object.rootUuid).toBe('uuid-1')
    expect(body.commands.cgpCommand[0].cgp.object.subDevice[0].value).toBe('on')
  })
})

describe('CommaxApi token refresh', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('re-authenticates on 401 and retries', async () => {
    const api = new CommaxApi('user', 'pass')
    api.token = 'expired-token'
    api.gatewayNo = 'gw-123'

    // First call returns 401
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      // Re-auth: POST to auth URL
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          user: { resourceNo: 'gw-123' },
          server: { iot: { ip: 'api.ruvie.co.kr', port: 4100 } }
        })
      })
      // Re-auth: GET gateways
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ gateways: [{ gatewayNo: 'gw-123' }] })
      })
      // Retry original request
      .mockResolvedValueOnce({ ok: true, json: async () => ({ gateway: { devices: { object: [] } } }) })

    const devices = await api.listDevices()
    expect(devices).toEqual([])
    expect(api.token).toBe('new-token')
  })
})
