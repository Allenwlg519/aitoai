# 端到端智能软件开发工具 — 架构文档

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                       客户端 (client/)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Vue 3    │  │ Pinia    │  │ Vue      │  │ Monaco │  │
│  │ 组件树   │  │ 状态管理  │  │ Router   │  │ Editor │  │
│  └────┬─────┘  └──────────┘  └──────────┘  └────────┘  │
│       │                WebSocket (ws://)                 │
│       └──────────────────────┬───────────────────────────┘
└──────────────────────────────┼────────────────────────────┘
                               │
┌──────────────────────────────┼────────────────────────────┐
│                       服务端 (server/)                    │
│       ┌──────────────────────┴───────────────────────────┐│
│       │              WebSocket 网关 (ws/)                 ││
│       │  消息路由 → 连接管理 → 心跳 → 错误处理           ││
│       └──────────────────────┬───────────────────────────┘│
│                              │                             │
│       ┌──────────────────────┴───────────────────────────┐│
│       │              控制器层 (controllers/)              ││
│       │   agent.controller  │  project.controller        ││
│       │   (消息解码/编码、参数校验、响应组装)              ││
│       └──────────────────────┬───────────────────────────┘│
│                              │                             │
│       ┌──────────────────────┴───────────────────────────┐│
│       │               服务层 (services/)                  ││
│       │  agent.service │  project.service │ session.svc   ││
│       │  (业务编排、状态机、事务管理)                      ││
│       └──────────────────────┬───────────────────────────┘│
│                              │                             │
│       ┌──────────────────────┴───────────────────────────┐│
│       │              Agent 核心 (core/)                   ││
│       │  agent(主循环) │  llm(模型抽象) │  tool(工具集)   ││
│       │  (感知→规划→执行→观察 循环)                       ││
│       └──────────────────────┬───────────────────────────┘│
│                              │                             │
│       ┌──────────────────────┴───────────────────────────┐│
│       │               工具层 (utils/)                     ││
│       │  logger │  validator │  errors                    ││
│       │  (通用基础设施)                                    ││
│       └──────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────┘
```

**架构模式**: 前后端分离的单页应用 (SPA) + 后端微服务风格分层。

**核心通信**: 全双工 WebSocket 长连接，所有业务消息经由 WebSocket 通道传输。

---

## 2. 前后端通信方式

### 2.1 WebSocket 协议

| 项目 | 说明 |
|------|------|
| 协议 | WebSocket (ws://) |
| 消息格式 | JSON（UTF-8 编码），详见 `PROTOCOL.md` |
| 连接地址 | `ws://localhost:3001/ws` |
| 协议版本 | v2.0 |
| 心跳 | 双向 `ping` / `pong`，服务端每 30s 检测一次 |

### 2.2 消息结构

所有业务消息遵循统一信封格式：

```json
{
  "type": "消息类型",
  "id": "消息唯一ID (UUID v4)",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "payload": {}
}
```

### 2.3 核心消息类型

| 类型 | 方向 | 说明 |
|------|------|------|
| `session_init` | Server → Client | 连接建立时下发会话 ID 和服务端能力声明 |
| `user_message` | Client → Server | 用户向 Agent 发送的指令或消息 |
| `agent_thought` | Server → Client | Agent 推理过程中的中间思考 |
| `tool_call` | Server → Client | Agent 请求调用工具（读/写/执行） |
| `tool_result` | Client → Server | 工具执行结果回传给 Agent |
| `code_diff` | Server → Client | Agent 生成的代码变更提议 |
| `error` | 双向 | 错误信息报告 |
| `ping` / `pong` | 双向 | 心跳保活 |

---

## 3. 后端模块划分

### 3.1 控制器层 (controllers/)

负责消息解码/编码、参数校验、响应组装。不包含业务逻辑。

- **agent.controller.js**: 处理 Agent 相关指令（run/stop/pause/resume），将请求转发给 agent.service
- **project.controller.js**: 处理项目文件操作（CRUD、文件树），将请求转发给 project.service

### 3.2 服务层 (services/)

负责业务逻辑编排、状态机管理、跨模块协调。

- **agent.service.js**: Agent 生命周期管理（状态机: idle → running → paused → completed/error）
- **project.service.js**: 项目文件 CRUD、目录遍历、项目快照管理
- **session.service.js**: SessionManager 类，管理会话生命周期与消息历史
  - `createSession(ws)` — 创建会话
  - `getHistory(sessionId)` — 获取历史消息
  - `addMessage(sessionId, msg)` — 追加消息（自动触发压缩）
  - `compressHistory(sessionId)` — 压缩历史（保留首尾 + 关键类型）

### 3.3 Agent 核心层 (core/)

智能体的核心引擎，与具体传输层无关。

- **agent.js**: Agent 主循环（感知 → 规划 → 执行 → 观察）
- **llm.js**: LLM 提供商抽象层，统一接口（支持切换 OpenAI / Claude / 本地模型）
- **tool.js**: 工具注册与执行沙箱，每个工具定义为 { name, description, handler }

### 3.4 工具层 (utils/)

通用基础设施工具。

- **logger.js**: 结构化日志输出（级别控制、格式化）
- **validator.js**: 消息结构校验（JSON Schema 风格）
- **errors.js**: 自定义错误类体系（AppError → ValidationError / AgentError / WsError）

---

## 4. 前端组件树规划

```
App.vue
├── AppHeader.vue              # 顶部导航栏
│   ├── Logo                   # 应用 Logo
│   ├── ProjectSelector        # 项目选择器
│   └── UserMenu               # 用户菜单
├── AppSidebar.vue             # 侧边栏
│   ├── ProjectTree.vue        # [递归] 文件树
│   │   └── FileIcon.vue       # 文件类型图标
│   └── (操作面板切换)
├── <router-view>              # 路由视图
│   ├── HomeView.vue           # 首页仪表盘
│   ├── AgentView.vue          # Agent 工作台
│   │   └── AgentPanel.vue     # Agent 交互面板
│   │       ├── AgentChat.vue  # 对话消息列表 + 输入
│   │       ├── AgentStatus.vue# 运行状态指示
│   │       └── AgentLog.vue   # 实时日志流
│   └── ProjectView.vue        # 项目管理页
│       ├── ProjectTree.vue    # 文件树
│       ├── ProjectEditor.vue  # 代码编辑器 (预留 Monaco)
│       └── ProjectPreview.vue # 预览面板
└── AppFooter.vue              # 底部状态栏
    ├── StatusDot.vue          # 连接状态指示
    ├── LoadingSpinner.vue     # 加载动画
    └── ConnectionStatus       # 连接信息
```

---

## 5. 数据流说明

```
用户操作 → Vue 组件 → useSocket composable → send('user_message', payload)
                                                ↓
                         WebSocket 消息 (JSON 信封)
                                                ↓
服务端 ws/handler → parseJSON → SessionManager.addMessage (存入历史)
                                                ↓
                         消息类型分发 (switch)
                        ├── ping → pong 回复
                        ├── user_message → Agent 模块 (桩)
                        │     └── sessionManager.send(sessionId, agent_thought)
                        └── tool_result → Agent 模块 (桩)
                                                ↓
服务端响应 → sessionManager.send(sessionId, response)
                                                ↓
前端 WebSocket onmessage → useSocket.messages 响应式数组更新
                                                ↓
                          Vue 响应式渲染 (AgentChat / AgentThought / ...)
```

---

## 6. 关键技术选型

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| 前端框架 | Vue 3 (Composition API) | 轻量、响应式、组合式 API 适合 Agent 交互场景 |
| 状态管理 | Pinia | Vue 3 官方推荐，TypeScript 友好 |
| 路由 | Vue Router 4 | Vue 3 官方路由 |
| 代码编辑器 | Monaco Editor (预留) | VS Code 同源，提供专业编辑体验 |
| 后端框架 | Express | Node.js 最成熟 Web 框架 |
| WebSocket | ws | Node.js 生态最轻量高性能 ws 库 |
| 构建工具 | Vite | 极速 HMR，Vue 3 生态标配 |
