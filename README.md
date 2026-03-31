# commax-mcp

[코맥스(Commax)](https://www.commax.com) 스마트홈을 AI로 제어하는 [MCP](https://modelcontextprotocol.io) 서버 및 [OpenClaw](https://openclaw.ai) 플러그인입니다.

코맥스 월패드가 설치된 아파트에서 조명, 보일러, 환기, 대기전력, 가스밸브 등을 자연어로 제어할 수 있습니다.

## 지원 기기 및 도구

| 도구 | 설명 |
|------|------|
| `list_devices` | 전체 기기 상태 조회 |
| `control_switch` | 조명/콘센트 on/off |
| `control_thermostat` | 보일러 모드(on/off) 및 온도 설정 (5–40°C) |
| `control_ventilation` | 환기 전원/풍량(low/medium/high)/모드(bypass/manual)/타이머(0/30/60/90분) |
| `read_air_quality` | 실내 공기질 조회 (CO2, PM2.5, PM10) |
| `read_meters` | 실시간 검침 (전기/수도/가스/온수/난방열량) |
| `control_standby_power` | 대기전력 콘센트 전원/모드/차단 임계값 |
| `control_gas_lock` | 가스 밸브 잠금 |
| `control_master_light` | 일괄 소등/점등 |
| `list_scenes` | 씬(자동화) 목록 조회 |
| `execute_scene` | 씬 실행 |
| `create_scene` | 씬 생성 (여러 기기를 한 번에 제어) |

## 요구사항

- Node.js 18+
- 코맥스 스마트홈 앱 계정 (Ruvie 클라우드 연동)

## 설치

```bash
git clone https://github.com/jaebong-human/commax-mcp.git
cd commax-mcp
npm install
npm run build
```

## 설정

### OpenClaw

```bash
openclaw plugins install commax-mcp
```

설치 후 config에 계정 정보를 추가:

```yaml
plugins:
  entries:
    'commax-mcp':
      enabled: true
      config:
        username: "your_username"
        password: "your_password"
```

### Claude Code

`.mcp.json` 파일을 프로젝트 루트 또는 `~/.claude/` 에 추가:

```json
{
  "mcpServers": {
    "commax": {
      "command": "node",
      "args": ["/path/to/commax-mcp/dist/index.js"],
      "env": {
        "COMMAX_USERNAME": "your_username",
        "COMMAX_PASSWORD": "your_password"
      }
    }
  }
}
```

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "commax": {
      "command": "node",
      "args": ["/path/to/commax-mcp/dist/index.js"],
      "env": {
        "COMMAX_USERNAME": "your_username",
        "COMMAX_PASSWORD": "your_password"
      }
    }
  }
}
```

## 사용 예시

```
"집에 불 다 꺼줘"
"보일러 01 온도 24도로 맞춰줘"
"공기질 확인해줘"
"환기 강풍으로 30분 틀어줘"
"이번 달 전기 사용량 얼마야?"
"외출할 건데 가스 잠그고 불 꺼줘"
```

## 호환성

코맥스 Ruvie 클라우드 API(`api.ruvie.co.kr`)를 사용하는 월패드에서 동작합니다. 코맥스 스마트홈 앱으로 기기가 정상 제어되는 환경이면 사용 가능합니다.

## 라이선스

MIT
