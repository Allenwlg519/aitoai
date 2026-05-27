# WebSocket 通信协议 v2.0

## 概述

前后端通过 WebSocket 全双工通信，所有消息均使用 JSON 格式（UTF-8 编码）。

---

## 通用信封

每条消息的外层结构如下：

```json
{
  "type": "<消息类型>",
  "id": "<UUID v4>",
  "timestamp": "<ISO 8601 时间戳>",
  "payload": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 消息类型（见消息类型表） |
| id | string | 消息唯一标识，UUID v4 |
| timestamp | string | ISO 8601 格式时间戳 |
| payload | object | 具体业务数据 |

---

## 消息类型

### 1. session_init

**方向**: 服务端 → 客户端  
**触发时机**: WebSocket 连接建立后立即发送

```json
{
  "type": "session_init",
  "id": "<UUID>",
  "timestamp": "<ISO 8601>",
  "payload": {
    "sessionId": "<分配的会话 ID>",
    "protocolVersion": "2.0",
    "serverCapabilities": {
      "maxMessageSize": 10485760,
      "supportedModels": ["gpt-4", "claude-3"],
      "features": ["code_diff", "tool_call"]
    }
  }
}
```

---

### 2. user_message

**方向**: 客户端 → 服务端  
**说明**: 用户向 Agent 发送的消息或指令

```json
{
  "type": "user_message",
  "id": "<UUID>",
  "timestamp": "<ISO 8601>",
  "payload": {
    "content": "请帮我实现一个用户登录功能",
    "attachments": [],
    "metadata": {}
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| content | string | 消息正文 |
| attachments | string[] | 关联文件路径列表（可选） |
| metadata | object | 扩展元数据（可选） |

---

### 3. agent_thought

**方向**: 服务端 → 客户端  
**说明**: Agent 推理过程中的中间思考，用于展示推理链路

```json
{
  "type": "agent_thought",
  "id": "<UUID>",
  "timestamp": "<ISO 8601>",
  "payload": {
    "agentId": "<Agent 会话 ID>",
    "step": 1,
    "title": "分析需求",
    "content": "用户需要登录功能，我需要...",
    "status": "thinking"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| agentId | string | Agent 执行实例标识 |
| step | number | 当前步骤序号 |
| title | string | 思考步骤标题 |
| content | string | 详细思考内容（Markdown 格式） |
| status | string | `thinking` \| `completed` |

---

### 4. tool_call

**方向**: 服务端 → 客户端  
**说明**: Agent 请求调用工具（如读写文件、执行命令）

```json
{
  "type": "tool_call",
  "id": "<UUID>",
  "timestamp": "<ISO 8601>",
  "payload": {
    "agentId": "<Agent 会话 ID>",
    "toolName": "write_file",
    "arguments": {
      "path": "/src/auth/login.js",
      "content": "..." 
    },
    "status": "pending"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| agentId | string | Agent 实例标识 |
| toolName | string | 工具名称 |
| arguments | object | 工具参数 |
| status | string | `pending` \| `running` \| `completed` |

---

### 5. tool_result

**方向**: 客户端 → 服务端  
**说明**: 工具执行结果回传给 Agent

```json
{
  "type": "tool_result",
  "id": "<UUID>",
  "timestamp": "<ISO 8601>",
  "payload": {
    "toolCallId": "<对应的 tool_call 消息 ID>",
    "success": true,
    "output": "文件已写入",
    "error": null
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| toolCallId | string | 对应 tool_call 的 id |
| success | boolean | 执行是否成功 |
| output | any | 执行输出 |
| error | string\|null | 错误信息 |

---

### 6. code_diff

**方向**: 服务端 → 客户端  
**说明**: Agent 生成的文件差异（建议的代码变更）

```json
{
  "type": "code_diff",
  "id": "<UUID>",
  "timestamp": "<ISO 8601>",
  "payload": {
    "agentId": "<Agent 会话 ID>",
    "filePath": "/src/auth/login.js",
    "action": "modify",
    "diff": "@@ -1,3 +1,5 @@\n+ const login = ...",
    "language": "javascript",
    "status": "proposed"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| filePath | string | 文件路径 |
| action | string | `create` \| `modify` \| `delete` |
| diff | string | Unified diff 格式 |
| language | string | 编程语言 |
| status | string | `proposed` \| `applied` \| `rejected` |

---

### 7. error

**方向**: 双向  
**说明**: 错误信息传递

```json
{
  "type": "error",
  "id": "<对应消息 ID 或 null>",
  "timestamp": "<ISO 8601>",
  "payload": {
    "code": "SESSION_NOT_FOUND",
    "message": "会话不存在或已过期",
    "details": {}
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | string | 错误码 |
| message | string | 错误描述 |
| details | object | 附加信息（可选） |

---

## 消息流程

```
  客户端                       服务端
    |                           |
    |--- WebSocket 连接 -------->|
    |<--- session_init ----------|
    |                           |
    |--- user_message ---------->|----+ 存入 SessionManager
    |                           |<---+
    |                           |
    |<--- agent_thought --------| Agent 推理中
    |<--- tool_call ------------| Agent 请求调用工具
    |                           |
    |--- tool_result ----------->|----+ 存入 SessionManager
    |                           |<---+
    |                           |
    |<--- agent_thought --------| Agent 继续推理
    |<--- code_diff ------------| Agent 输出代码变更
    |<--- agent_thought --------| Agent 总结完成
```

---

## 心跳

客户端和服务端均可发起 `ping`，对方必须回复 `pong`，payload 均为空。

```json
{ "type": "ping", "id": "<UUID>", "timestamp": "<ISO 8601>", "payload": {} }
{ "type": "pong", "id": "<UUID>", "timestamp": "<ISO 8601>", "payload": {} }
```
