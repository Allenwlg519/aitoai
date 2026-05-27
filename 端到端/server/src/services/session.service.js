/**
 * 会话管理器 SessionManager
 * 职责: 管理 WebSocket 会话生命周期和消息历史
 *       提供 createSession / getHistory / addMessage / compressHistory 标准方法
 *       内部使用 Map<sessionId, Session> 存储
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/* 会话数据结构:
 * {
 *   ws: WebSocket,              // 连接实例
 *   createdAt: number,          // 创建时间戳
 *   lastActivity: number,       // 最后活动时间
 *   history: Message[],         // 消息历史
 *   metadata: {}                // 扩展元数据
 * }
 */

/** 单个会话的最大历史消息数，超过后触发压缩 */
const MAX_HISTORY_LENGTH = 200;

/** 压缩后保留的消息数 */
const COMPRESSED_HISTORY_LENGTH = 50;

class SessionManager {
  constructor() {
    /** @type {Map<string, { ws: import('ws').WebSocket, createdAt: number, lastActivity: number, history: object[], metadata: object }>} */
    this.sessions = new Map();
  }

  /**
   * 创建新会话
   * @param {import('ws').WebSocket} ws - WebSocket 连接实例
   * @returns {string} 新生成的 sessionId
   */
  createSession(ws) {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      ws,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      history: [],
      metadata: {},
    });
    logger.info('会话已创建', { sessionId });
    return sessionId;
  }

  /**
   * 获取指定会话的消息历史
   * @param {string} sessionId
   * @returns {object[]} 消息数组（按时间正序）
   */
  getHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.history;
  }

  /**
   * 向会话追加一条消息
   * @param {string} sessionId
   * @param {object} message - 符合协议信封格式的消息对象
   */
  addMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('尝试向不存在的会话添加消息', { sessionId });
      return;
    }
    session.history.push(message);
    session.lastActivity = Date.now();

    // 超过阈值时触发压缩
    if (session.history.length > MAX_HISTORY_LENGTH) {
      this.compressHistory(sessionId);
    }
  }

  /**
   * 压缩会话历史：丢弃中间消息，仅保留关键消息
   * 策略：保留首尾部分 + 特定类型的消息 (user_message, error)
   * @param {string} sessionId
   */
  compressHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.history.length <= COMPRESSED_HISTORY_LENGTH) return;

    const history = session.history;

    // 保留第一条（通常是初始指令）
    const kept = [history[0]];

    // 从尾部往前保留 COMPRESSED_HISTORY_LENGTH 条关键消息
    const tail = [];
    for (let i = history.length - 1; i >= 0 && tail.length < COMPRESSED_HISTORY_LENGTH - 1; i--) {
      const msg = history[i];
      // 优先保留 user_message 和 error 类型；其余消息做去重
      if (msg.type === 'user_message' || msg.type === 'error') {
        tail.unshift(msg);
      } else if (tail.length < COMPRESSED_HISTORY_LENGTH - 5) {
        // 留一些位置给其他类型
        tail.unshift(msg);
      }
    }

    session.history = kept.concat(tail);
    logger.info('会话历史已压缩', {
      sessionId,
      beforeLength: history.length,
      afterLength: session.history.length,
    });
  }

  /**
   * 获取会话信息
   * @param {string} sessionId
   * @returns {{ ws: import('ws').WebSocket, createdAt: number, lastActivity: number, history: object[], metadata: object }|undefined}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * 通过 WebSocket 实例查找 sessionId
   * @param {import('ws').WebSocket} ws
   * @returns {string|undefined}
   */
  findSessionByWs(ws) {
    for (const [id, session] of this.sessions) {
      if (session.ws === ws) return id;
    }
    return undefined;
  }

  /**
   * 删除会话
   * @param {string} sessionId
   */
  removeSession(sessionId) {
    this.sessions.delete(sessionId);
    logger.info('会话已删除', { sessionId });
  }

  /**
   * 向指定会话发送 JSON 消息
   * @param {string} sessionId
   * @param {object} message
   */
  send(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (session && session.ws.readyState === session.ws.OPEN) {
      session.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 向所有活跃会话广播消息
   * @param {object} message
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    for (const session of this.sessions.values()) {
      if (session.ws.readyState === session.ws.OPEN) {
        session.ws.send(data);
      }
    }
  }

  /**
   * 获取当前活跃会话数
   * @returns {number}
   */
  getActiveCount() {
    return this.sessions.size;
  }
}

// 导出单例
module.exports = new SessionManager();
