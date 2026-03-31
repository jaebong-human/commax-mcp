import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { CommaxApi } from './api.js'
import {
  handleListDevices, handleControlSwitch, handleControlThermostat,
  handleControlVentilation, handleReadAirQuality, handleReadMeters,
  handleControlStandbyPower, handleControlGasLock, handleControlMasterLight,
  handleListScenes, handleExecuteScene, handleCreateScene
} from './tools.js'

const username = process.env.COMMAX_USERNAME
const password = process.env.COMMAX_PASSWORD

if (!username || !password) {
  console.error('COMMAX_USERNAME and COMMAX_PASSWORD must be set')
  process.exit(1)
}

const api = new CommaxApi(username, password)

const server = new Server(
  { name: 'commax-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_devices',
      description: '집의 모든 IoT 기기 목록과 현재 상태를 반환합니다.',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'control_switch',
      description: '조명 또는 콘센트를 켜거나 끕니다.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '기기 이름 (예: 전등 01)' },
          value: { type: 'string', enum: ['on', 'off'], description: '켜기/끄기' }
        },
        required: ['name', 'value']
      }
    },
    {
      name: 'control_ventilation',
      description: '환기 시스템을 제어합니다 (전원, 풍량, 모드, 타이머).',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '기기 이름 (예: 환기 01)' },
          power: { type: 'string', enum: ['on', 'off'], description: '전원 켜기/끄기' },
          speed: { type: 'string', enum: ['low', 'medium', 'high'], description: '풍량 (약/중/강)' },
          mode: { type: 'string', enum: ['bypass', 'manual'], description: '환기 모드' },
          timer: { type: 'number', enum: [0, 30, 60, 90], description: '타이머 (분)' }
        },
        required: ['name']
      }
    },
    {
      name: 'control_thermostat',
      description: '보일러 모드(on/off) 또는 온도를 설정합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '기기 이름 (예: 보일러 01)' },
          mode: { type: 'string', enum: ['on', 'off'], description: '난방 모드' },
          temperature: { type: 'number', description: '설정 온도 (5–40°C)' }
        },
        required: ['name']
      }
    },
    {
      name: 'read_air_quality',
      description: '실내 공기질을 조회합니다 (CO2, PM2.5, PM10).',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'read_meters',
      description: '실시간 검침 데이터를 조회합니다 (전기, 수도, 가스, 온수, 난방열량).',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'control_standby_power',
      description: '대기전력 콘센트를 제어합니다 (전원, 모드, 차단 임계값).',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '기기 이름 (예: 대기 전력 01)' },
          power: { type: 'string', enum: ['on', 'off'], description: '전원 켜기/끄기' },
          mode: { type: 'string', enum: ['auto', 'manual'], description: '모드 (자동차단/수동)' },
          threshold: { type: 'number', description: '대기전력 차단 임계값 (W)' }
        },
        required: ['name']
      }
    },
    {
      name: 'control_gas_lock',
      description: '가스 밸브를 잠급니다 (안전상 잠금만 지원).',
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'string', enum: ['lock'], description: '잠금' }
        },
        required: ['value']
      }
    },
    {
      name: 'control_master_light',
      description: '일괄 소등/점등을 제어합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          value: { type: 'string', enum: ['on', 'off'], description: '점등/소등' }
        },
        required: ['value']
      }
    },
    {
      name: 'list_scenes',
      description: '등록된 씬(자동화) 목록을 조회합니다.',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'execute_scene',
      description: '씬(자동화)을 실행합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '씬 ID 또는 이름' }
        },
        required: ['id']
      }
    },
    {
      name: 'create_scene',
      description: '여러 기기를 한 번에 제어하는 씬(자동화)을 생성합니다.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '씬 이름' },
          devices: {
            type: 'array',
            description: '제어할 기기 배열',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '기기 이름 (예: 전등 01)' },
                sort: { type: 'string', description: '제어 속성 (예: switchBinary, thermostatMode)' },
                value: { type: 'string', description: '설정 값 (예: on, off, heat)' }
              },
              required: ['name', 'sort', 'value']
            }
          }
        },
        required: ['name', 'devices']
      }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params
  try {
    let text: string
    if (name === 'list_devices') {
      text = await handleListDevices(api)
    } else if (name === 'control_switch') {
      const { name: deviceName, value } = args as { name: string; value: 'on' | 'off' }
      text = await handleControlSwitch(api, { name: deviceName, value })
    } else if (name === 'control_ventilation') {
      const { name: deviceName, power, speed, mode, timer } = args as {
        name: string
        power?: 'on' | 'off'
        speed?: 'low' | 'medium' | 'high'
        mode?: 'bypass' | 'manual'
        timer?: number
      }
      text = await handleControlVentilation(api, { name: deviceName, power, speed, mode, timer })
    } else if (name === 'control_thermostat') {
      const { name: deviceName, mode, temperature } = args as {
        name: string
        mode?: 'on' | 'off'
        temperature?: number
      }
      text = await handleControlThermostat(api, { name: deviceName, mode, temperature })
    } else if (name === 'read_air_quality') {
      text = await handleReadAirQuality(api)
    } else if (name === 'read_meters') {
      text = await handleReadMeters(api)
    } else if (name === 'control_standby_power') {
      const { name: deviceName, power, mode, threshold } = args as {
        name: string
        power?: 'on' | 'off'
        mode?: 'auto' | 'manual'
        threshold?: number
      }
      text = await handleControlStandbyPower(api, { name: deviceName, power, mode, threshold })
    } else if (name === 'control_gas_lock') {
      const { value } = args as { value: 'lock' }
      text = await handleControlGasLock(api, { value })
    } else if (name === 'control_master_light') {
      const { value } = args as { value: 'on' | 'off' }
      text = await handleControlMasterLight(api, { value })
    } else if (name === 'list_scenes') {
      text = await handleListScenes(api)
    } else if (name === 'execute_scene') {
      const { id } = args as { id: string }
      text = await handleExecuteScene(api, { id })
    } else if (name === 'create_scene') {
      const { name: sceneName, devices } = args as {
        name: string
        devices: Array<{ name: string; sort: string; value: string }>
      }
      text = await handleCreateScene(api, { name: sceneName, devices })
    } else {
      throw new Error(`Unknown tool: ${name}`)
    }
    return { content: [{ type: 'text', text }] }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
