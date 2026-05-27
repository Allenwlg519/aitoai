/**
 * PermissionGuard
 * 职责: 用户审批安全墙
 *   - 敏感工具调用前生成 permission_request 推送前端
 *   - 用户批准/拒绝后 resolve/reject Promise，继续或取消执行
 *   - 支持 sessionId 白名单（"本次会话始终允许"）
 *   - 60 秒超时自动拒绝
 */
const logger = require('../utils/logger');

/** 权限请求默认超时时间 (ms) */
const REQUEST_TIMEOUT = 60000;

class PermissionGuard {
  constructor() {
    /** @type {Map<string, { resolve: function, reject: function, toolName: string, args: object, timestamp: number }>} */
    this.pendingRequests = new Map();
    /** @type {Set<string>} sessionId 白名单 */
    this.sessionWhitelist = new Set();
    this.timeout = REQUEST_TIMEOUT;
  }

  /**
   * 将会话加入白名单（"本次会话始终允许"）
   * @param {string} sessionId
   */
  whitelistSession(sessionId) {
    this.sessionWhitelist.add(sessionId);
    logger.info('会话已加入权限白名单', { sessionId });
  }

  /**
   * 检查会话是否在白名单中
   * @param {string} sessionId
   * @returns {boolean}
   */
  isWhitelisted(sessionId) {
    return this.sessionWhitelist.has(sessionId);
  }

  /**
   * 从白名单移除会话
   * @param {string} sessionId
   */
  removeWhitelist(sessionId) {
    this.sessionWhitelist.delete(sessionId);
  }

  /**
   * 请求用户审批工具调用
   * 白名单命中时自动通过，否则挂起等待 resolvePermission
   * @param {string} sessionId
   * @param {string} toolCallId
   * @param {string} toolName
   * @param {object} args
   * @returns {Promise<boolean>} true=批准, false=拒绝/超时
   */
  async requestPermission(sessionId, toolCallId, toolName, args) {
    // 白名单命中 → 自动通过
    if (this.isWhitelisted(sessionId)) {
      logger.debug('权限自动通过（白名单）', { sessionId, toolName });
      return true;
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(toolCallId, {
        resolve,
        reject,
        toolName,
        args,
        timestamp: Date.now(),
      });

      // 超时自动拒绝
      setTimeout(() => {
        const entry = this.pendingRequests.get(toolCallId);
        if (entry) {
          this.pendingRequests.delete(toolCallId);
          logger.warn('权限请求超时，自动拒绝', { sessionId, toolCallId, toolName });
          resolve(false);
        }
      }, this.timeout);
    });
  }

  /**
   * 处理用户的审批响应
   * @param {string} toolCallId
   * @param {boolean} approved - true=批准, false=拒绝
   * @param {boolean} alwaysAllow - 是否"本次会话始终允许"
   * @returns {boolean} 是否找到对应的 pending 请求
   */
  resolvePermission(toolCallId, approved, alwaysAllow = false) {
    const entry = this.pendingRequests.get(toolCallId);
    if (!entry) return false;

    this.pendingRequests.delete(toolCallId);

    // 用户勾选"始终允许" → 加入白名单
    // 需要从 resolvePermission 的调用方获取 sessionId，这里用约定：
    // 调用方应在 resolvePermission 前先处理 alwaysAllow
    if (alwaysAllow) {
      logger.info('用户选择了"本次会话始终允许"', { toolName: entry.toolName });
    }

    entry.resolve(approved);
    return true;
  }

  /**
   * 获取当前待审批请求数
   * @returns {number}
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }
}

module.exports = PermissionGuard;
