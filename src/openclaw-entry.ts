import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import { CommaxApi } from "./api.js";
import {
  handleListDevices, handleControlSwitch, handleControlThermostat,
  handleControlVentilation, handleReadAirQuality, handleReadMeters,
  handleControlStandbyPower, handleControlGasLock, handleControlMasterLight,
  handleListScenes, handleExecuteScene, handleCreateScene
} from "./tools.js";

let api: CommaxApi | null = null;

function getApi(pluginApi: any): CommaxApi {
  if (!api) {
    const config = pluginApi.getConfig();
    api = new CommaxApi(config.username, config.password);
  }
  return api;
}

export default definePluginEntry({
  id: "commax-mcp",
  name: "Commax Smart Home",
  description: "Control Commax smart home devices via AI",

  register(pluginApi) {
    // list_devices
    pluginApi.registerTool({
      name: "commax_list_devices",
      description: "집의 모든 IoT 기기 목록과 현재 상태를 반환합니다.",
      parameters: Type.Object({}),
      async execute() {
        const text = await handleListDevices(getApi(pluginApi));
        return { content: [{ type: "text", text }] };
      },
    });

    // control_switch
    pluginApi.registerTool({
      name: "commax_control_switch",
      description: "조명 또는 콘센트를 켜거나 끕니다.",
      parameters: Type.Object({
        name: Type.String({ description: "기기 이름 (예: 전등 01)" }),
        value: Type.Union([Type.Literal("on"), Type.Literal("off")], { description: "켜기/끄기" }),
      }),
      async execute(_id, params) {
        const text = await handleControlSwitch(getApi(pluginApi), params);
        return { content: [{ type: "text", text }] };
      },
    });

    // control_thermostat
    pluginApi.registerTool({
      name: "commax_control_thermostat",
      description: "보일러 모드(on/off) 또는 온도를 설정합니다.",
      parameters: Type.Object({
        name: Type.String({ description: "기기 이름 (예: 보일러 01)" }),
        mode: Type.Optional(Type.Union([Type.Literal("on"), Type.Literal("off")], { description: "난방 모드" })),
        temperature: Type.Optional(Type.Number({ description: "설정 온도 (5–40°C)" })),
      }),
      async execute(_id, params) {
        const text = await handleControlThermostat(getApi(pluginApi), params);
        return { content: [{ type: "text", text }] };
      },
    });

    // control_ventilation
    pluginApi.registerTool({
      name: "commax_control_ventilation",
      description: "환기 시스템을 제어합니다 (전원, 풍량, 모드, 타이머).",
      parameters: Type.Object({
        name: Type.String({ description: "기기 이름 (예: 환기 01)" }),
        power: Type.Optional(Type.Union([Type.Literal("on"), Type.Literal("off")], { description: "전원" })),
        speed: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")], { description: "풍량" })),
        mode: Type.Optional(Type.Union([Type.Literal("bypass"), Type.Literal("manual")], { description: "환기 모드" })),
        timer: Type.Optional(Type.Number({ description: "타이머 (0, 30, 60, 90분)" })),
      }),
      async execute(_id, params) {
        const text = await handleControlVentilation(getApi(pluginApi), params);
        return { content: [{ type: "text", text }] };
      },
    });

    // read_air_quality
    pluginApi.registerTool({
      name: "commax_read_air_quality",
      description: "실내 공기질을 조회합니다 (CO2, PM2.5, PM10).",
      parameters: Type.Object({}),
      async execute() {
        const text = await handleReadAirQuality(getApi(pluginApi));
        return { content: [{ type: "text", text }] };
      },
    });

    // read_meters
    pluginApi.registerTool({
      name: "commax_read_meters",
      description: "실시간 검침 데이터를 조회합니다 (전기, 수도, 가스, 온수, 난방열량).",
      parameters: Type.Object({}),
      async execute() {
        const text = await handleReadMeters(getApi(pluginApi));
        return { content: [{ type: "text", text }] };
      },
    });

    // control_standby_power
    pluginApi.registerTool({
      name: "commax_control_standby_power",
      description: "대기전력 콘센트를 제어합니다 (전원, 모드, 차단 임계값).",
      parameters: Type.Object({
        name: Type.String({ description: "기기 이름 (예: 대기 전력 01)" }),
        power: Type.Optional(Type.Union([Type.Literal("on"), Type.Literal("off")], { description: "전원" })),
        mode: Type.Optional(Type.Union([Type.Literal("auto"), Type.Literal("manual")], { description: "모드" })),
        threshold: Type.Optional(Type.Number({ description: "대기전력 차단 임계값 (W)" })),
      }),
      async execute(_id, params) {
        const text = await handleControlStandbyPower(getApi(pluginApi), params);
        return { content: [{ type: "text", text }] };
      },
    });

    // control_gas_lock
    pluginApi.registerTool({
      name: "commax_control_gas_lock",
      description: "가스 밸브를 잠급니다 (안전상 잠금만 지원).",
      parameters: Type.Object({
        value: Type.Literal("lock", { description: "잠금" }),
      }),
      async execute(_id, params) {
        const text = await handleControlGasLock(getApi(pluginApi), params);
        return { content: [{ type: "text", text }] };
      },
    });

    // control_master_light
    pluginApi.registerTool({
      name: "commax_control_master_light",
      description: "일괄 소등/점등을 제어합니다.",
      parameters: Type.Object({
        value: Type.Union([Type.Literal("on"), Type.Literal("off")], { description: "점등/소등" }),
      }),
      async execute(_id, params) {
        const text = await handleControlMasterLight(getApi(pluginApi), params);
        return { content: [{ type: "text", text }] };
      },
    });

    // list_scenes
    pluginApi.registerTool({
      name: "commax_list_scenes",
      description: "등록된 씬(자동화) 목록을 조회합니다.",
      parameters: Type.Object({}),
      async execute() {
        const text = await handleListScenes(getApi(pluginApi));
        return { content: [{ type: "text", text }] };
      },
    });

    // execute_scene
    pluginApi.registerTool({
      name: "commax_execute_scene",
      description: "씬(자동화)을 실행합니다.",
      parameters: Type.Object({
        id: Type.String({ description: "씬 ID 또는 이름" }),
      }),
      async execute(_id, params) {
        const text = await handleExecuteScene(getApi(pluginApi), params);
        return { content: [{ type: "text", text }] };
      },
    });

    // create_scene
    pluginApi.registerTool({
      name: "commax_create_scene",
      description: "여러 기기를 한 번에 제어하는 씬(자동화)을 생성합니다.",
      parameters: Type.Object({
        name: Type.String({ description: "씬 이름" }),
        devices: Type.Array(
          Type.Object({
            name: Type.String({ description: "기기 이름 (예: 전등 01)" }),
            sort: Type.String({ description: "제어 속성 (예: switchBinary)" }),
            value: Type.String({ description: "설정 값 (예: on, off)" }),
          }),
          { description: "제어할 기기 배열" }
        ),
      }),
      async execute(_id, params) {
        const text = await handleCreateScene(getApi(pluginApi), params);
        return { content: [{ type: "text", text }] };
      },
    });
  },
});
