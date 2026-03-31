import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleListDevices, handleControlSwitch, handleControlThermostat } from '../src/tools.js'
import type { CommaxApi, Device } from '../src/api.js'

const mockDevices: Device[] = [
  {
    rootUuid: 'uuid-switch-1',
    rootDevice: 'switch',
    nickname: '전등 01',
    subDevice: [{ subUuid: 'sub-1', sort: 'switchBinary', value: 'off', type: 'readWrite' }]
  },
  {
    rootUuid: 'uuid-thermo-1',
    rootDevice: 'thermostat',
    nickname: '보일러 01',
    subDevice: [
      { subUuid: 'sub-mode', sort: 'thermostatMode', value: 'off', type: 'readWrite' },
      { subUuid: 'sub-temp', sort: 'thermostatSetpoint', value: '22', type: 'readWrite', option1: '5', option2: '40', precision: '0' }
    ]
  }
]

const mockApi = {
  listDevices: vi.fn().mockResolvedValue(mockDevices),
  sendCommand: vi.fn().mockResolvedValue(undefined)
} as unknown as CommaxApi

beforeEach(() => vi.clearAllMocks())

describe('handleListDevices', () => {
  it('returns device summary text', async () => {
    const result = await handleListDevices(mockApi)
    expect(result).toContain('전등 01')
    expect(result).toContain('switchBinary: off')
    expect(result).toContain('보일러 01')
  })
})

describe('handleControlSwitch', () => {
  it('turns switch on', async () => {
    const result = await handleControlSwitch(mockApi, { name: '전등 01', value: 'on' })
    expect(mockApi.sendCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        rootUuid: 'uuid-switch-1',
        subDevice: expect.arrayContaining([
          expect.objectContaining({ sort: 'switchBinary', value: 'on' })
        ])
      })
    )
    expect(result).toContain('전등 01')
    expect(result).toContain('on')
  })

  it('throws when device not found', async () => {
    await expect(
      handleControlSwitch(mockApi, { name: '없는기기', value: 'on' })
    ).rejects.toThrow('Device not found: 없는기기')
  })
})

describe('handleControlThermostat', () => {
  it('sets mode and temperature', async () => {
    const result = await handleControlThermostat(mockApi, {
      name: '보일러 01',
      mode: 'on',
      temperature: 24
    })
    expect(mockApi.sendCommand).toHaveBeenCalledTimes(2)
    expect(result).toContain('보일러 01')
  })

  it('sets only temperature if mode not provided', async () => {
    await handleControlThermostat(mockApi, { name: '보일러 01', temperature: 20 })
    expect(mockApi.sendCommand).toHaveBeenCalledTimes(1)
    const call = (mockApi.sendCommand as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.subDevice[0].sort).toBe('thermostatSetpoint')
    expect(call.subDevice[0].value).toBe('20')
  })

  it('throws on temperature out of range', async () => {
    await expect(
      handleControlThermostat(mockApi, { name: '보일러 01', temperature: 99 })
    ).rejects.toThrow('Temperature must be between 5 and 40')
  })
})
