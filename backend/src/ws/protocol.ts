/**
 * WebSocket 消息协议定义
 * 职责: 定义消息类型常量、消息结构注释、版本说明
 */

export const MESSAGE_TYPES = {
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

export interface Message {
  type: string;
  id: string;
  timestamp: string;
  payload: any;
}

export interface AgentStatusPayload {
  agentId: string;
  state: 'running' | 'paused' | 'completed' | 'error';
  progress?: number;
}

export interface AgentLogPayload {
  agentId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface PermissionRequestPayload {
  toolCallId: string;
  toolName: string;
  args: object;
}

export interface CodeDiffPayload {
  title: string;
  oldContent: string;
  newContent: string;
}

export interface ShellOutputPayload {
  line: string;
}
