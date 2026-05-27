/**
 * Agent 控制器
 * 职责: 处理 Agent 相关的 WebSocket 消息（解码、校验、响应组装）
 *       不包含业务逻辑，仅做请求转发
 */

const agentService = require('../services/agent.service');

/**
 * 处理 agent:run 消息 — 启动 Agent 执行
 * @param {object} payload - { task, context, options }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
async function handleRun(payload, sessionId) {
  // TODO: 参数校验
  return agentService.start(payload, sessionId);
}

/**
 * 处理 agent:stop 消息 — 停止 Agent
 * @param {object} payload - { agentId }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
async function handleStop(payload, sessionId) {
  return agentService.stop(payload.agentId, sessionId);
}

/**
 * 处理 agent:pause 消息 — 暂停 Agent
 * @param {object} payload - { agentId }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
async function handlePause(payload, sessionId) {
  return agentService.pause(payload.agentId, sessionId);
}

/**
 * 处理 agent:resume 消息 — 恢复 Agent
 * @param {object} payload - { agentId }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
async function handleResume(payload, sessionId) {
  return agentService.resume(payload.agentId, sessionId);
}

/**
 * 处理 agent:message 消息 — Agent 对话消息
 * @param {object} payload - { agentId, content }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
async function handleMessage(payload, sessionId) {
  return agentService.sendMessage(payload, sessionId);
}

module.exports = {
  handleRun,
  handleStop,
  handlePause,
  handleResume,
  handleMessage,
};
