/**
 * Agent 控制器
 * 职责: 处理 Agent 相关的 WebSocket 消息（解码、校验、响应组装）
 *       不包含业务逻辑，仅做请求转发
 */

import { logger } from '../utils';
import { agentService } from '../services';

/**
 * 处理 agent:run 消息 — 启动 Agent 执行
 * @param {object} payload - { task, context, options }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
export async function handleRun(payload: { task: string; context?: object; options?: object }, sessionId: string) {
  logger.info('Agent启动请求', { sessionId, task: payload.task });
  return agentService.start(payload, sessionId);
}

/**
 * 处理 agent:stop 消息 — 停止 Agent
 * @param {object} payload - { agentId }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
export async function handleStop(payload: { agentId: string }, sessionId: string) {
  logger.info('Agent停止请求', { sessionId, agentId: payload.agentId });
  return agentService.stop(payload.agentId, sessionId);
}

/**
 * 处理 agent:pause 消息 — 暂停 Agent
 * @param {object} payload - { agentId }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
export async function handlePause(payload: { agentId: string }, sessionId: string) {
  logger.info('Agent暂停请求', { sessionId, agentId: payload.agentId });
  return agentService.pause(payload.agentId, sessionId);
}

/**
 * 处理 agent:resume 消息 — 恢复 Agent
 * @param {object} payload - { agentId }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
export async function handleResume(payload: { agentId: string }, sessionId: string) {
  logger.info('Agent恢复请求', { sessionId, agentId: payload.agentId });
  return agentService.resume(payload.agentId, sessionId);
}

/**
 * 处理 agent:message 消息 — Agent 对话消息
 * @param {object} payload - { agentId, content }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
export async function handleMessage(payload: { agentId: string; content: string }, sessionId: string) {
  logger.info('Agent消息', { sessionId, agentId: payload.agentId });
  return agentService.sendMessage(payload, sessionId);
}

/**
 * 处理 permission_response 消息 — 权限审批响应
 * @param {object} payload - { toolCallId, approved, alwaysAllow }
 * @param {string} sessionId - 发送者会话 ID
 * @returns {Promise<object>} 响应消息
 */
export async function handlePermissionResponse(payload: { toolCallId: string; approved: boolean; alwaysAllow?: boolean }, sessionId: string) {
  logger.info('权限审批响应', { sessionId, toolCallId: payload.toolCallId, approved: payload.approved });
  return agentService.handlePermission(payload, sessionId);
}

export const agentController = {
  handleRun,
  handleStop,
  handlePause,
  handleResume,
  handleMessage,
  handlePermissionResponse,
};
