/**
 * 消息校验工具
 * 职责: 校验 WebSocket 消息结构完整性、参数合法性
 */

const logger = require('./logger');

/**
 * 校验 WebSocket 消息信封
 * @param {object} message - 原始解析后的消息对象
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateMessageEnvelope(message) {
  const errors = [];

  if (!message || typeof message !== 'object') {
    return { valid: false, errors: ['消息必须是非空对象'] };
  }

  if (!message.type || typeof message.type !== 'string') {
    errors.push('缺少或无效的 "type" 字段');
  }

  if (message.payload !== undefined && (typeof message.payload !== 'object' || message.payload === null)) {
    errors.push('"payload" 必须是对象');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验 payload 是否包含必需的字段
 * @param {object} payload
 * @param {string[]} requiredFields - 必需字段名列表
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateRequiredFields(payload, requiredFields) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload 是必需的'] };
  }

  for (const field of requiredFields) {
    if (payload[field] === undefined || payload[field] === null) {
      errors.push(`缺少必需字段: "${field}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验并解析 JSON 字符串
 * @param {string} raw - 原始消息字符串
 * @returns {{ parsed: object|null, error: string|null }}
 */
function parseRawMessage(raw) {
  try {
    const parsed = JSON.parse(raw);
    return { parsed, error: null };
  } catch (err) {
    logger.warn('JSON 解析失败', { raw: raw.slice(0, 200) });
    return { parsed: null, error: '无效的 JSON 格式' };
  }
}

module.exports = {
  validateMessageEnvelope,
  validateRequiredFields,
  parseRawMessage,
};
