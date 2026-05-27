/**
 * API 统一导出
 * 职责: 封装后端通信接口，提供更高级的业务方法
 */

import { send, subscribe } from './ws'

// ---- Agent 接口 ----

/** 启动 Agent */
export function runAgent(task, context = {}, options = {}) {
  send('agent:run', { task, context, options })
}

/** 停止 Agent */
export function stopAgent(agentId) {
  send('agent:stop', { agentId })
}

/** 暂停 Agent */
export function pauseAgent(agentId) {
  send('agent:pause', { agentId })
}

/** 恢复 Agent */
export function resumeAgent(agentId) {
  send('agent:resume', { agentId })
}

/** 发送对话消息 */
export function sendAgentMessage(agentId, content) {
  send('agent:message', { agentId, content })
}

// ---- 权限接口 ----

/** 响应权限审批请求 */
export function respondPermission(toolCallId, approved, alwaysAllow = false) {
  send('permission_response', { toolCallId, approved, alwaysAllow })
}

// ---- 项目接口 ----

/** 导入本地目录作为项目（通过 WS 发送路径） */
export function importProject(dirPath) {
  send('project:import', { dirPath })
}

/** 读取文件 */
export function readFile(filePath) {
  send('project:read', { filePath })
}

/** 写入文件 */
export function writeFile(filePath, content) {
  send('project:write', { filePath, content })
}

/** 删除文件 */
export function deleteFile(filePath) {
  send('project:delete', { filePath })
}

/** 获取文件树 */
export function getFileTree(dirPath = '') {
  send('project:tree', { dirPath })
}

export { subscribe }
