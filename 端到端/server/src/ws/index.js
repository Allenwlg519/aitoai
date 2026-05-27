/**
 * WebSocket 服务初始化
 * 职责: 创建 WebSocket.Server 实例
 *       连接建立时创建会话、发送 session_init
 *       集成心跳检测与断线清理
 */
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const { handleConnection } = require('./handler');
const sessionManager = require('../services/session.service');
const agentService = require('../services/agent.service');
const projectService = require('../services/project.service');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * 将 WebSocket 服务绑定到 HTTP 服务器
 * @param {import('http').Server} server - HTTP 服务器实例
 */
function initWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    maxPayload: config.ws.maxPayload,
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info('WebSocket 客户端连接', { ip: clientIp });

    // 1. 创建会话
    const sessionId = sessionManager.createSession(ws);

    // 2. 发送 session_init
    const initMessage = {
      type: 'session_init',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        sessionId,
        protocolVersion: '2.0',
        serverCapabilities: {
          maxMessageSize: config.ws.maxPayload,
          supportedModels: [config.llm.provider],
          features: ['code_diff', 'tool_call'],
        },
      },
    };
    ws.send(JSON.stringify(initMessage));

    // 3. 交由 handler 接管后续消息
    handleConnection(ws, sessionId);

    ws.on('close', (code, reason) => {
      sessionManager.removeSession(sessionId);
      agentService.destroySandbox(sessionId);
      projectService.removeSession(sessionId);
      logger.info('WebSocket 客户端断开', { sessionId, code, reason: reason?.toString() });
    });

    ws.on('error', (err) => {
      logger.error('WebSocket 连接错误', { sessionId, error: err.message });
    });
  });

  // 心跳检测定时器
  const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        const sid = sessionManager.findSessionByWs(ws);
        logger.warn('心跳超时，终止连接', { sessionId: sid });
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, config.ws.heartbeatInterval);

  wss.on('close', () => clearInterval(heartbeatTimer));

  // 重置 isAlive 标记
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  logger.info('WebSocket 服务初始化完成');
  return wss;
}

module.exports = { initWebSocketServer };
