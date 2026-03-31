import type { CommaxApi, SceneAction } from './api.js'

export async function handleListDevices(api: CommaxApi): Promise<string> {
  const devices = await api.listDevices()
  if (devices.length === 0) return 'No devices found.'

  return devices.map(d => {
    const caps = d.subDevice
      .map(sd => `  - ${sd.sort}: ${sd.value}`)
      .join('\n')
    return `[${d.rootDevice}] ${d.nickname}\n${caps}`
  }).join('\n\n')
}

export async function handleControlSwitch(
  api: CommaxApi,
  args: { name: string; value: 'on' | 'off' }
): Promise<string> {
  const devices = await api.listDevices()
  const device = devices.find(d => d.nickname === args.name && d.rootDevice === 'switch')
  if (!device) throw new Error(`Device not found: ${args.name}`)

  const binarySubDevice = device.subDevice.find(sd => sd.sort === 'switchBinary')
  if (!binarySubDevice) throw new Error(`No switchBinary capability on: ${args.name}`)

  await api.sendCommand({
    ...device,
    subDevice: [{ ...binarySubDevice, value: args.value }]
  })

  return `${args.name} turned ${args.value}`
}

export async function handleControlThermostat(
  api: CommaxApi,
  args: { name: string; mode?: 'on' | 'off'; temperature?: number }
): Promise<string> {
  if (args.temperature !== undefined && (args.temperature < 5 || args.temperature > 40)) {
    throw new Error('Temperature must be between 5 and 40')
  }

  const devices = await api.listDevices()
  const device = devices.find(d => d.nickname === args.name && d.rootDevice === 'thermostat')
  if (!device) throw new Error(`Device not found: ${args.name}`)

  const results: string[] = []

  if (args.mode !== undefined) {
    const modeSubDevice = device.subDevice.find(sd => sd.sort === 'thermostatMode')
    if (!modeSubDevice) throw new Error(`No thermostatMode capability on: ${args.name}`)
    const modeValue = args.mode === 'on' ? 'heat' : 'off'
    await api.sendCommand({
      ...device,
      subDevice: [{ ...modeSubDevice, value: modeValue }]
    })
    results.push(`mode → ${args.mode}`)
  }

  if (args.temperature !== undefined) {
    const tempSubDevice = device.subDevice.find(sd => sd.sort === 'thermostatSetpoint')
    if (!tempSubDevice) throw new Error(`No thermostatSetpoint capability on: ${args.name}`)
    await api.sendCommand({
      ...device,
      subDevice: [{ ...tempSubDevice, value: String(args.temperature) }]
    })
    results.push(`temperature → ${args.temperature}°C`)
  }

  return `${args.name}: ${results.join(', ')}`
}

export async function handleControlVentilation(
  api: CommaxApi,
  args: { name: string; power?: 'on' | 'off'; speed?: 'low' | 'medium' | 'high'; mode?: 'bypass' | 'manual'; timer?: number }
): Promise<string> {
  const devices = await api.listDevices()
  const device = devices.find(d => d.nickname === args.name && d.rootDevice === 'switch')
  if (!device) throw new Error(`Device not found: ${args.name}`)

  const results: string[] = []

  if (args.power !== undefined) {
    const sd = device.subDevice.find(s => s.sort === 'switchBinary')
    if (!sd) throw new Error(`No switchBinary on: ${args.name}`)
    await api.sendCommand({ ...device, subDevice: [{ ...sd, value: args.power }] })
    results.push(`power → ${args.power}`)
  }

  if (args.speed !== undefined) {
    const sd = device.subDevice.find(s => s.sort === 'fanSpeed')
    if (!sd) throw new Error(`No fanSpeed on: ${args.name}`)
    await api.sendCommand({ ...device, subDevice: [{ ...sd, value: args.speed }] })
    results.push(`speed → ${args.speed}`)
  }

  if (args.mode !== undefined) {
    const sd = device.subDevice.find(s => s.sort === 'modeBinary')
    if (!sd) throw new Error(`No modeBinary on: ${args.name}`)
    await api.sendCommand({ ...device, subDevice: [{ ...sd, value: args.mode }] })
    results.push(`mode → ${args.mode}`)
  }

  if (args.timer !== undefined) {
    if (![0, 30, 60, 90].includes(args.timer)) {
      throw new Error('Timer must be 0, 30, 60, or 90 minutes')
    }
    const sd = device.subDevice.find(s => s.sort === 'reservation')
    if (!sd) throw new Error(`No reservation on: ${args.name}`)
    await api.sendCommand({ ...device, subDevice: [{ ...sd, value: String(args.timer) }] })
    results.push(`timer → ${args.timer}min`)
  }

  return `${args.name}: ${results.join(', ')}`
}

export async function handleReadAirQuality(api: CommaxApi): Promise<string> {
  const devices = await api.listDevices()
  const sensor = devices.find(d => d.rootDevice === 'measurementSensors')
  if (!sensor) return 'No air quality sensor found.'

  const co2 = sensor.subDevice.find(s => s.sort === 'co2')?.value ?? '?'
  const pm25 = sensor.subDevice.find(s => s.sort === 'airQuality2.5')?.value ?? '?'
  const pm10 = sensor.subDevice.find(s => s.sort === 'airQuality10')?.value ?? '?'

  return `공기질 현황:\n  CO2: ${co2} ppm\n  PM2.5: ${pm25} µg/m³\n  PM10: ${pm10} µg/m³`
}

export async function handleReadMeters(api: CommaxApi): Promise<string> {
  const devices = await api.listDevices()
  const meter = devices.find(d => d.rootDevice === 'meter')
  if (!meter) return 'No meter found.'

  const water = meter.subDevice.find(s => s.sort === 'waterMeter')?.value ?? '?'
  const gas = meter.subDevice.find(s => s.sort === 'gasMeter')?.value ?? '?'
  const electric = meter.subDevice.find(s => s.sort === 'electricMeter')?.value ?? '?'
  const warm = meter.subDevice.find(s => s.sort === 'warmMeter')?.value ?? '?'
  const heat = meter.subDevice.find(s => s.sort === 'heatMeter')?.value ?? '?'

  return `실시간 검침:\n  전기: ${electric} W\n  수도: ${water} m³/h\n  가스: ${gas} m³/h\n  온수: ${warm} m³/h\n  난방열량: ${heat} kW`
}

export async function handleControlStandbyPower(
  api: CommaxApi,
  args: { name: string; power?: 'on' | 'off'; mode?: 'auto' | 'manual'; threshold?: number }
): Promise<string> {
  const devices = await api.listDevices()
  const device = devices.find(d => d.nickname === args.name && d.rootDevice === 'switch')
  if (!device) throw new Error(`Device not found: ${args.name}`)

  const results: string[] = []

  if (args.power !== undefined) {
    const sd = device.subDevice.find(s => s.sort === 'switchBinary')
    if (!sd) throw new Error(`No switchBinary on: ${args.name}`)
    await api.sendCommand({ ...device, subDevice: [{ ...sd, value: args.power }] })
    results.push(`power → ${args.power}`)
  }

  if (args.mode !== undefined) {
    const sd = device.subDevice.find(s => s.sort === 'modeBinary')
    if (!sd) throw new Error(`No modeBinary on: ${args.name}`)
    await api.sendCommand({ ...device, subDevice: [{ ...sd, value: args.mode }] })
    results.push(`mode → ${args.mode}`)
  }

  if (args.threshold !== undefined) {
    const sd = device.subDevice.find(s => s.sort === 'metersetting')
    if (!sd) throw new Error(`No metersetting on: ${args.name}`)
    await api.sendCommand({ ...device, subDevice: [{ ...sd, value: String(args.threshold) }] })
    results.push(`threshold → ${args.threshold}W`)
  }

  const meterSd = device.subDevice.find(s => s.sort === 'electricMeter')
  if (meterSd) {
    results.push(`current usage: ${meterSd.value}W`)
  }

  return `${args.name}: ${results.join(', ')}`
}

export async function handleControlGasLock(
  api: CommaxApi,
  args: { value: 'lock' }
): Promise<string> {
  const devices = await api.listDevices()
  const device = devices.find(d => d.rootDevice === 'lock')
  if (!device) throw new Error('Gas lock device not found')

  const sd = device.subDevice.find(s => s.sort === 'gasLock')
  if (!sd) throw new Error('No gasLock capability')

  await api.sendCommand({ ...device, subDevice: [{ ...sd, value: args.value }] })
  return `가스 밸브: 잠금 완료`
}

export async function handleControlMasterLight(
  api: CommaxApi,
  args: { value: 'on' | 'off' }
): Promise<string> {
  const devices = await api.listDevices()
  const device = devices.find(d => d.nickname === '일괄 소등 01' && d.rootDevice === 'switch')
  if (!device) throw new Error('Master light switch not found')

  const sd = device.subDevice.find(s => s.sort === 'switchBinary')
  if (!sd) throw new Error('No switchBinary on master light')

  await api.sendCommand({ ...device, subDevice: [{ ...sd, value: args.value }] })
  return `일괄 소등: ${args.value === 'off' ? '전체 소등' : '전체 점등'}`
}

export async function handleListScenes(api: CommaxApi): Promise<string> {
  const scenes = await api.listScenes()
  if (scenes.length === 0) return 'No scenes found.'

  return scenes.map(s => {
    const actions = s.actions?.action ?? []
    const actionDesc = actions.map(a => {
      const sorts = a.object.subDevice.map(sd => `${sd.sort}=${sd.value}`).join(', ')
      return `    ${a.object.nickname}: ${sorts}`
    }).join('\n')
    return `[${s.id}] ${s.name} (${s.enabled ? 'enabled' : 'disabled'})\n${actionDesc}`
  }).join('\n\n')
}

export async function handleExecuteScene(
  api: CommaxApi,
  args: { id: string }
): Promise<string> {
  const scenes = await api.listScenes()
  const scene = scenes.find(s => s.id === args.id || s.name === args.id)
  if (!scene) throw new Error(`Scene not found: ${args.id}`)

  await api.executeScene(scene.id)
  return `씬 "${scene.name}" 실행 완료`
}

export async function handleCreateScene(
  api: CommaxApi,
  args: { name: string; devices: Array<{ name: string; sort: string; value: string }> }
): Promise<string> {
  const allDevices = await api.listDevices()
  const gatewayNo = (api as any).gatewayNo as string

  const actions: SceneAction[] = args.devices.map(d => {
    const device = allDevices.find(dev => dev.nickname === d.name)
    if (!device) throw new Error(`Device not found: ${d.name}`)
    const sd = device.subDevice.find(s => s.sort === d.sort)
    if (!sd) throw new Error(`No ${d.sort} on ${d.name}`)

    return {
      object: {
        subDevice: [{ subUuid: sd.subUuid, sort: d.sort, funcCommand: 'set', value: d.value }],
        nickname: device.nickname,
        rootUuid: device.rootUuid,
        rootDevice: device.rootDevice
      },
      type: '1',
      gatewayNo
    }
  })

  const sceneId = await api.createScene(args.name, actions)
  return `씬 "${args.name}" 생성 완료 (id: ${sceneId})`
}
