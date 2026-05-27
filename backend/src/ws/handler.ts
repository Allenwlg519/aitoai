/**
 * WebSocket 消息处理器
 * 职责: 解析、路由和处理WebSocket消息
 */

import { WebSocket } from 'ws';
import { logger } from '../utils';
import { MESSAGE_TYPES, Message } from './protocol';
import { agentController } from '../controllers';

interface Session {
  id: string;
  ws: WebSocket;
  agentId: string | null;
}

const sessions = new Map<string, Session>();

/**
 * 发送消息给客户端
 */
export function sendMessage(ws: WebSocket, type: string, payload: any, id?: string) {
  const message: Message = {
    type,
    id: id || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    payload,
  };
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * 广播消息给所有客户端
 */
export function broadcastMessage(type: string, payload: any) {
  const message: Message = {
    type,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    payload,
  };
  const data = JSON.stringify(message);
  sessions.forEach((session) => {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(data);
    }
  });
}

/**
 * 发送Agent状态更新
 */
export function sendAgentStatus(ws: WebSocket, agentId: string, state: 'running' | 'paused' | 'completed' | 'error', progress?: number) {
  sendMessage(ws, MESSAGE_TYPES.AGENT_STATUS, { agentId, state, progress });
}

/**
 * 发送Agent日志
 */
export function sendAgentLog(ws: WebSocket, agentId: string, level: 'info' | 'warn' | 'error', message: string) {
  sendMessage(ws, MESSAGE_TYPES.AGENT_LOG, {
    agentId,
    level,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 发送Agent消息
 */
export function sendAgentMessage(ws: WebSocket, agentId: string, content: string) {
  sendMessage(ws, MESSAGE_TYPES.AGENT_MESSAGE, { agentId, content });
}

/**
 * 发送权限请求
 */
export function sendPermissionRequest(ws: WebSocket, toolCallId: string, toolName: string, args: object) {
  sendMessage(ws, MESSAGE_TYPES.PERMISSION_REQUEST, { toolCallId, toolName, args });
}

/**
 * 发送代码差异
 */
export function sendCodeDiff(ws: WebSocket, title: string, oldContent: string, newContent: string) {
  sendMessage(ws, MESSAGE_TYPES.CODE_DIFF, { title, oldContent, newContent });
}

/**
 * 发送Shell输出
 */
export function sendShellOutput(ws: WebSocket, line: string) {
  sendMessage(ws, MESSAGE_TYPES.SHELL_OUTPUT, { line });
}

/**
 * 发送错误消息
 */
export function sendError(ws: WebSocket, code: string, message: string) {
  sendMessage(ws, MESSAGE_TYPES.ERROR, { code, message });
}

/**
 * 处理消息路由
 */
async function handleMessage(session: Session, message: Message) {
  try {
    switch (message.type) {
      case MESSAGE_TYPES.AGENT_RUN:
        await handleAgentRun(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.AGENT_STOP:
        await handleAgentStop(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.AGENT_PAUSE:
        await handleAgentPause(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.AGENT_RESUME:
        await handleAgentResume(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.AGENT_MESSAGE:
        await handleAgentMessage(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.PERMISSION_RESPONSE:
        await handlePermissionResponse(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.PROJECT_IMPORT:
        await handleProjectImport(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.PROJECT_READ:
        await handleProjectRead(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.PROJECT_WRITE:
        await handleProjectWrite(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.PROJECT_DELETE:
        await handleProjectDelete(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.PROJECT_TREE:
        await handleProjectTree(session, message.payload, message.id);
        break;

      case MESSAGE_TYPES.PING:
        sendMessage(session.ws, MESSAGE_TYPES.PONG, {});
        break;

      default:
        logger.warn('未知消息类型', { type: message.type });
        sendError(session.ws, 'UNKNOWN_MESSAGE_TYPE', `未知消息类型: ${message.type}`);
    }
  } catch (error) {
    logger.error('消息处理失败', error);
    sendError(session.ws, 'INTERNAL_ERROR', (error as Error).message || '内部错误');
  }
}

// === Agent 处理器 ===

async function handleAgentRun(session: Session, payload: { task: string; context?: object; options?: object }, messageId: string) {
  try {
    const result = await agentController.handleRun(payload, session.id);
    if (result.agentId) {
      session.agentId = result.agentId;
    }
    sendAgentStatus(session.ws, result.agentId, 'running');
  } catch (error) {
    sendError(session.ws, 'AGENT_RUN_ERROR', (error as Error).message);
  }
}

async function handleAgentStop(session: Session, payload: { agentId: string }, messageId: string) {
  try {
    await agentController.handleStop(payload, session.id);
    session.agentId = null;
    sendAgentStatus(session.ws, payload.agentId, 'completed');
  } catch (error) {
    sendError(session.ws, 'AGENT_STOP_ERROR', (error as Error).message);
  }
}

async function handleAgentPause(session: Session, payload: { agentId: string }, messageId: string) {
  try {
    await agentController.handlePause(payload, session.id);
    sendAgentStatus(session.ws, payload.agentId, 'paused');
  } catch (error) {
    sendError(session.ws, 'AGENT_PAUSE_ERROR', (error as Error).message);
  }
}

async function handleAgentResume(session: Session, payload: { agentId: string }, messageId: string) {
  try {
    await agentController.handleResume(payload, session.id);
    sendAgentStatus(session.ws, payload.agentId, 'running');
  } catch (error) {
    sendError(session.ws, 'AGENT_RESUME_ERROR', (error as Error).message);
  }
}

async function handleAgentMessage(session: Session, payload: { agentId: string; content: string }, messageId: string) {
  try {
    await agentController.handleMessage(payload, session.id);
  } catch (error) {
    sendError(session.ws, 'AGENT_MESSAGE_ERROR', (error as Error).message);
  }
}

// === 权限处理器 ===

async function handlePermissionResponse(session: Session, payload: { toolCallId: string; approved: boolean; alwaysAllow?: boolean }, messageId: string) {
  try {
    await agentController.handlePermissionResponse(payload, session.id);
  } catch (error) {
    sendError(session.ws, 'PERMISSION_ERROR', (error as Error).message);
  }
}

// === 项目处理器 ===

async function handleProjectImport(session: Session, payload: { dirPath: string }, messageId: string) {
  sendMessage(session.ws, MESSAGE_TYPES.PROJECT_RESULT, { success: true, message: '项目导入功能开发中' });
}

async function handleProjectRead(session: Session, payload: { filePath: string }, messageId: string) {
  sendMessage(session.ws, MESSAGE_TYPES.PROJECT_RESULT, { success: true, content: '' });
}

async function handleProjectWrite(session: Session, payload: { filePath: string; content: string }, messageId: string) {
  sendMessage(session.ws, MESSAGE_TYPES.PROJECT_RESULT, { success: true });
}

async function handleProjectDelete(session: Session, payload: { filePath: string }, messageId: string) {
  sendMessage(session.ws, MESSAGE_TYPES.PROJECT_RESULT, { success: true });
}

async function handleProjectTree(session: Session, payload: { dirPath?: string }, messageId: string) {
  sendMessage(session.ws, MESSAGE_TYPES.PROJECT_RESULT, { success: true, tree: [] });
}

/**
 * 处理新连接
 */
export function handleConnection(ws: WebSocket) {
  const sessionId = crypto.randomUUID();
  const session: Session = { id: sessionId, ws, agentId: null };
  sessions.set(sessionId, session);

  logger.info('WebSocket客户端连接', { sessionId });

  // 发送连接建立消息
  sendMessage(ws, MESSAGE_TYPES.CONNECTION_ESTABLISHED, { sessionId });

  ws.on('message', async (data) => {
    try {
      const message: Message = JSON.parse(data.toString());
      logger.debug('收到WebSocket消息', { type: message.type, sessionId });
      await handleMessage(session, message);
    } catch (error) {
      logger.error('消息解析失败', error);
      sendError(ws, 'INVALID_MESSAGE', '消息格式无效');
    }
  });

  ws.on('close', () => {
    sessions.delete(sessionId);
    logger.info('WebSocket客户端断开', { sessionId });
  });

  ws.on('error', (error) => {
    logger.error('WebSocket错误', { sessionId, error });
    sessions.delete(sessionId);
  });
}

/**
 * 获取会话
 */
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}
