/**
 * WebSocket 消息分发处理
 * 职责: 接收原始消息 → JSON 解析 → 存入 SessionManager 历史
 *       按 type 分发到 Agent 模块或系统处理
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const validator = require('../utils/validator');
const sessionManager = require('../services/session.service');
const agentService = require('../services/agent.service');
const projectController = require('../controllers/project.controller');

/**
 * 处理新的 WebSocket 连接
 * @param {import('ws').WebSocket} ws
 * @param {string} sessionId
 */
function handleConnection(ws, sessionId) {
  ws.on('message', (raw) => {
    handleRawMessage(ws, sessionId, raw);
  });
}

/**
 * 处理原始消息
 * @param {import('ws').WebSocket} ws
 * @param {string} sessionId
 * @param {Buffer|string} raw
 */
async function handleRawMessage(ws, sessionId, raw) {
  // 1. 解析 JSON
  const { parsed, error: parseError } = validator.parseRawMessage(raw.toString());
  if (parseError) {
    logger.warn('消息 JSON 解析失败', { sessionId, error: parseError });
    sendError(ws, null, 'INVALID_JSON', parseError);
    return;
  }

  // 2. 校验通用信封
  const { valid, errors } = validator.validateMessageEnvelope(parsed);
  if (!valid) {
    sendError(ws, parsed?.id, 'VALIDATION_ERROR', errors.join('; '));
    return;
  }

  const { type, id, payload } = parsed;

  // 3. 先存入 SessionManager 历史
  sessionManager.addMessage(sessionId, parsed);

  // 4. 按类型分发
  switch (type) {
    case 'ping':
      handlePing(ws, id);
      break;

    case 'user_message':
      try {
        await agentService.sendMessage(payload, sessionId);
      } catch (err) {
        logger.error('Agent 消息处理失败', { sessionId, error: err.message });
        sendError(ws, id, 'AGENT_ERROR', err.message);
      }
      break;

    case 'tool_result':
      logger.info('[预留] 收到客户端 tool_result', {
        sessionId,
        toolCallId: payload?.toolCallId,
      });
      break;

    case 'permission_response':
      handlePermissionResponse(ws, id, payload, sessionId);
      break;

    // ---- 项目消息 ----
    case 'project:import':
      await handleProjectMessage(ws, id, payload, sessionId, projectController.handleImport);
      break;

    case 'project:read':
      await handleProjectMessage(ws, id, payload, sessionId, projectController.handleRead);
      break;

    case 'project:write':
      await handleProjectMessage(ws, id, payload, sessionId, projectController.handleWrite);
      break;

    case 'project:delete':
      await handleProjectMessage(ws, id, payload, sessionId, projectController.handleDelete);
      break;

    case 'project:tree':
      await handleProjectMessage(ws, id, payload, sessionId, projectController.handleTree);
      break;

    default:
      sendError(ws, id, 'UNKNOWN_TYPE', `不支持的消息类型: ${type}`);
  }
}

/**
 * 处理用户对权限请求的响应
 * @param {import('ws').WebSocket} ws
 * @param {string} messageId
 * @param {object} payload
 * @param {string} sessionId
 */
function handlePermissionResponse(ws, messageId, payload, sessionId) {
  const { toolCallId, approved, alwaysAllow } = payload;

  if (toolCallId == null) {
    sendError(ws, messageId, 'VALIDATION_ERROR', '缺少 toolCallId');
    return;
  }

  // 用户勾选"本次会话始终允许" → 加入白名单
  if (alwaysAllow && approved) {
    agentService.getPermissionGuard().whitelistSession(sessionId);
  }

  // 解析 pending 请求
  const resolved = agentService.getPermissionGuard().resolvePermission(toolCallId, approved);

  if (!resolved) {
    sendError(ws, messageId, 'PERMISSION_ERROR', '权限请求已过期或不存在');
    return;
  }

  logger.info('权限请求已处理', {
    sessionId,
    toolCallId,
    approved,
    alwaysAllow,
  });
}

/**
 * 处理 ping/pong 心跳
 * @param {import('ws').WebSocket} ws
 * @param {string} messageId
 */
function handlePing(ws, messageId) {
  const pong = {
    type: 'pong',
    id: messageId,
    timestamp: new Date().toISOString(),
    payload: {},
  };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(pong));
  }
}

/**
 * 发送错误消息
 * @param {import('ws').WebSocket} ws
 * @param {string|null} messageId
 * @param {string} code
 * @param {string} message
 */
function sendError(ws, messageId, code, message) {
  const errorMsg = {
    type: 'error',
    id: messageId,
    timestamp: new Date().toISOString(),
    payload: { code, message },
  };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(errorMsg));
  }
}

/**
 * 通用项目消息处理：执行 controller 方法并回复结果
 * @param {import('ws').WebSocket} ws
 * @param {string} messageId
 * @param {object} payload
 * @param {string} sessionId
 * @param {function} handlerFn - (payload, sessionId) => Promise<object>
 */
async function handleProjectMessage(ws, messageId, payload, sessionId, handlerFn) {
  try {
    const result = await handlerFn(payload, sessionId);
    const response = {
      type: 'project:result',
      id: messageId,
      timestamp: new Date().toISOString(),
      payload: { success: true, data: result },
    };
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(response));
    }
  } catch (err) {
    sendError(ws, messageId, 'PROJECT_ERROR', err.message);
  }
}

module.exports = { handleConnection };
