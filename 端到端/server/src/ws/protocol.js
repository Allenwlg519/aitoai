/**
 * WebSocket 消息协议定义
 * 职责: 定义消息类型常量、消息结构注释、版本说明
 */

/**
 * ========================================
 *  消息协议 v1.0
 * ========================================
 *
 * 所有消息均为 JSON 格式，UTF-8 编码。
 *
 * ---- 通用信封格式 ----
 * {
 *   "type": "string",      // 消息类型，见 MESSAGE_TYPES
 *   "id": "string",        // 消息唯一 ID (UUID v4)
 *   "timestamp": "string", // ISO 8601 时间戳
 *   "payload": {}          // 业务数据，具体结构因 type 而异
 * }
 *
 * ---- 消息类型及 payload 结构 ----
 *
 * 1. agent:run        客户端 → 服务端
 *    payload: { task: string, context?: object, options?: { model?: string } }
 *    说明: 启动一个新的 Agent 任务
 *
 * 2. agent:stop       客户端 → 服务端
 *    payload: { agentId: string }
 *
 * 3. agent:pause      客户端 → 服务端
 *    payload: { agentId: string }
 *
 * 4. agent:resume     客户端 → 服务端
 *    payload: { agentId: string }
 *
 * 5. agent:message    双向
 *    客户端发送: { agentId: string, content: string }
 *    服务端回复: { agentId: string, content: string, steps?: [] }
 *
 * 6. agent:status     服务端 → 客户端
 *    payload: { agentId: string, state: 'running'|'paused'|'completed'|'error',
 *               progress?: number }
 *    说明: 实时推送 Agent 状态变更
 *
 * 7. agent:log        服务端 → 客户端
 *    payload: { agentId: string, level: 'info'|'warn'|'error', message: string,
 *               timestamp: string }
 *    说明: 实时日志推送
 *
 * 8. agent:completed  服务端 → 客户端
 *    payload: { agentId: string, result: any, summary: string,
 *               totalSteps: number, duration: number }
 *
 * 9. agent:error      服务端 → 客户端
 *    payload: { agentId: string, code: string, message: string }
 *
 * 10. project:read    客户端 → 服务端
 *     payload: { projectId: string, filePath: string }
 *
 * 11. project:write   客户端 → 服务端
 *     payload: { projectId: string, filePath: string, content: string }
 *
 * 12. project:delete  客户端 → 服务端
 *     payload: { projectId: string, filePath: string }
 *
 * 13. project:tree    客户端 → 服务端
 *     payload: { projectId: string, dirPath?: string }
 *
 * 14. ping/pong       双向心跳
 *     payload: {}
 */

/** 消息类型常量 */
const MESSAGE_TYPES = {
  // Agent 控制指令
  AGENT_RUN: 'agent:run',
  AGENT_STOP: 'agent:stop',
  AGENT_PAUSE: 'agent:pause',
  AGENT_RESUME: 'agent:resume',
  AGENT_MESSAGE: 'agent:message',
  AGENT_STATUS: 'agent:status',
  AGENT_LOG: 'agent:log',
  AGENT_COMPLETED: 'agent:completed',
  AGENT_ERROR: 'agent:error',

  // Agent 实时事件
  AGENT_THOUGHT: 'agent_thought',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  CODE_DIFF: 'code_diff',
  SHELL_OUTPUT: 'shell_output',
  PERMISSION_REQUEST: 'permission_request',
  PERMISSION_RESPONSE: 'permission_response',

  // 项目操作
  PROJECT_IMPORT: 'project:import',
  PROJECT_READ: 'project:read',
  PROJECT_WRITE: 'project:write',
  PROJECT_DELETE: 'project:delete',
  PROJECT_TREE: 'project:tree',
  PROJECT_RESULT: 'project:result',
  PROJECT_UPDATED: 'project:updated',

  // 系统消息
  PING: 'ping',
  PONG: 'pong',
  CONNECTION_ESTABLISHED: 'connection:established',
  ERROR: 'error',
};

module.exports = {
  MESSAGE_TYPES,
};
