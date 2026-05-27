/**
 * 结构化日志工具
 * 职责: 提供统一的日志输出接口（级别控制、格式化、可扩展传输）
 */

const config = require('../config');

/** 日志级别权重映射 */
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LEVELS[config.logLevel] ?? LEVELS.info;

/**
 * 格式化日志输出
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {object} [meta] - 附加元数据
 */
function log(level, message, meta) {
  if (LEVELS[level] < currentLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};

module.exports = logger;
