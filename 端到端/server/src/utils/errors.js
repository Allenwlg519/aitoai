/**
 * 错误类与处理工具
 * 职责: 定义统一错误类体系，提供错误序列化与处理函数
 */

/**
 * 应用错误基类
 */
class AppError extends Error {
  /**
   * @param {string} message - 人类可读的错误描述
   * @param {string} code - 机器可读的错误代码
   * @param {number} [statusCode=500] - HTTP 状态码（用于 REST 端点）
   */
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }

  /**
   * 将错误序列化为 WS 消息 payload
   * @returns {object} { code, message }
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/** 参数校验错误 */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/** Agent 执行错误 */
class AgentError extends AppError {
  constructor(message) {
    super(message, 'AGENT_ERROR', 500);
    this.name = 'AgentError';
  }
}

/** WebSocket 通信错误 */
class WsError extends AppError {
  constructor(message) {
    super(message, 'WS_ERROR', 500);
    this.name = 'WsError';
  }
}

/** 文件操作错误 */
class FileError extends AppError {
  constructor(message) {
    super(message, 'FILE_ERROR', 500);
    this.name = 'FileError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AgentError,
  WsError,
  FileError,
};
