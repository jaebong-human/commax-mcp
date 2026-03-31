export interface SubDevice {
  subUuid: string
  sort: string
  value: string
  type?: string
  option1?: string
  option2?: string
  precision?: string
}

export interface SceneAction {
  object: {
    subDevice: Array<{ subUuid: string; sort: string; funcCommand: string; value: string }>
    nickname: string
    rootUuid: string
    rootDevice: string
    commaxDevice?: string
  }
  type: string
  gatewayNo: string
}

export interface Scene {
  id: string
  name: string
  enabled: boolean
  actions?: { action: SceneAction[] }
}

export interface Device {
  rootUuid: string
  rootDevice: string
  nickname: string
  subDevice: SubDevice[]
}

const AUTH_URL = 'https://biz.ruvie.co.kr:4000/oauth/authorize'
const CLIENT_ID = 'APP-AND-com.commax.ipiot'
const CLIENT_SECRET = 'uqPDprbr0tt1SzegBIhE-a'
const DEVICE_HEADERS: Record<string, string> = {
  'cmx-dvc-uuid': 'mcp-server-001',
  'cmx-dvc-os': 'AND',
  'cmx-app-version': '0.0.0.1'
}

export class CommaxApi {
  token: string | null = null
  gatewayNo: string | null = null

  constructor(
    private readonly username: string,
    private readonly password: string
  ) {}

  async authenticate(): Promise<void> {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'password',
      username: this.username,
      password: this.password
    })

    const res = await fetch(`${AUTH_URL}?${params}`, {
      headers: DEVICE_HEADERS
    })
    if (!res.ok) throw new Error(`Auth failed: ${res.status}`)

    const data = await res.json() as {
      access_token: string
      user: { resourceNo: string }
      server: { iot: { ip: string; port: number } }
    }

    this.token = data.access_token

    const gwRes = await fetch(`https://api.ruvie.co.kr:4100/v1/gateways`, {
      headers: { Authorization: `Bearer ${this.token}` }
    })
    if (!gwRes.ok) throw new Error(`Failed to fetch gateways: ${gwRes.status}`)

    const gwData = await gwRes.json() as { gateways: { gateway: Array<{ gatewayNo: string }> } }
    this.gatewayNo = gwData.gateways.gateway[0].gatewayNo
  }

  async ensureAuth(): Promise<void> {
    if (!this.token) await this.authenticate()
  }

  async listDevices(): Promise<Device[]> {
    await this.ensureAuth()
    const res = await fetch(
      `https://api.ruvie.co.kr:4100/v1/gateways/${this.gatewayNo}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
    if (res.status === 401) {
      this.token = null
      await this.authenticate()
      return this.listDevices()
    }
    if (!res.ok) throw new Error(`Failed to list devices: ${res.status}`)

    const data = await res.json() as {
      gateway: { devices: { object: Array<Device & { visible: string }> } }
    }

    return data.gateway.devices.object
      .filter(d => d.visible !== 'false')
      .map(d => ({
        rootUuid: d.rootUuid,
        rootDevice: d.rootDevice,
        nickname: d.nickname,
        subDevice: d.subDevice
      }))
  }

  async listScenes(): Promise<Scene[]> {
    await this.ensureAuth()
    const res = await fetch(
      `https://api.ruvie.co.kr:4100/v1/scenes/`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
    if (!res.ok) throw new Error(`Failed to list scenes: ${res.status}`)
    const data = await res.json() as { scenes: { scene: Scene[] } }
    return data.scenes.scene
  }

  async executeScene(sceneId: string): Promise<void> {
    await this.ensureAuth()
    const res = await fetch(
      `https://api.ruvie.co.kr:4100/v1/scenes/${sceneId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    if (!res.ok) throw new Error(`Failed to execute scene: ${res.status}`)
  }

  async createScene(name: string, actions: SceneAction[]): Promise<string> {
    await this.ensureAuth()
    const body = {
      scene: {
        name,
        type: '1',
        enabled: true,
        iconPath: '0',
        triggers: { trigger: [] },
        actions: { action: actions }
      }
    }
    const res = await fetch(
      `https://api.ruvie.co.kr:4100/v1/scenes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )
    if (!res.ok) throw new Error(`Failed to create scene: ${res.status}`)
    const data = await res.json() as { scene: { id: string } }
    return data.scene.id
  }

  async sendCommand(device: Device): Promise<void> {
    await this.ensureAuth()
    const body = {
      commands: {
        cgpCommand: [{
          gatewayNo: this.gatewayNo,
          cgp: {
            command: 'set',
            object: {
              rootUuid: device.rootUuid,
              rootDevice: device.rootDevice,
              nickname: device.nickname,
              subDevice: device.subDevice.map(sd => ({
                subUuid: sd.subUuid,
                type: sd.type ?? 'readWrite',
                sort: sd.sort,
                funcCommand: 'set',
                value: sd.value,
                ...(sd.option1 && { option1: sd.option1 }),
                ...(sd.option2 && { option2: sd.option2 }),
                ...(sd.precision !== undefined && { precision: sd.precision })
              }))
            }
          }
        }]
      }
    }

    const res = await fetch('https://api.ruvie.co.kr:4100/v1/command', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    if (res.status === 401) {
      this.token = null
      await this.authenticate()
      return this.sendCommand(device)
    }
    if (!res.ok) throw new Error(`Command failed: ${res.status}`)
  }
}
