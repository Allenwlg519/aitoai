/**
 * LLM 提供商抽象层
 * 职责: 统一多种 LLM 提供商（OpenAI / Claude / 本地模型）的调用接口
 *       支持流式响应、上下文管理、模型切换
 */

/**
 * @typedef {object} LLMMessage
 * @property {'system'|'user'|'assistant'} role - 角色
 * @property {string} content - 消息内容
 */

/**
 * @typedef {object} LLMConfig
 * @property {string} provider - 提供商名称
 * @property {string} apiKey - API 密钥
 * @property {string} model - 模型名称
 * @property {number} maxTokens - 最大 Token 数
 * @property {number} temperature - 采样温度
 */

class LLMService {
  /**
   * @param {LLMConfig} config
   */
  constructor(config) {
    this.config = config;
    this.provider = this._createProvider(config);
  }

  /**
   * 根据配置创建对应提供商的客户端实例
   * @param {LLMConfig} config
   * @returns {object} 提供商客户端实例
   */
  _createProvider(config) {
    // TODO: 根据 config.provider 初始化 OpenAI / Claude / 本地 LLM 客户端
    return null;
  }

  /**
   * 发送对话请求并获取完整响应
   * @param {LLMMessage[]} messages - 消息列表
   * @param {object} [options] - 覆盖默认配置
   * @returns {Promise<string>} 响应文本
   */
  async chat(messages, options) {
    // TODO: 调用 provider 的 chat completion 接口
    return '';
  }

  /**
   * 发送对话请求并以流式方式获取响应
   * @param {LLMMessage[]} messages - 消息列表
   * @param {object} [options]
   * @param {function} onChunk - 流式回调 (chunk: string) => void
   * @returns {Promise<string>} 完整响应文本
   */
  async chatStream(messages, options, onChunk) {
    // TODO: 调用 provider 的流式接口，逐片回调
    return '';
  }

  /**
   * 切换模型
   * @param {string} model - 新的模型名称
   */
  switchModel(model) {
    this.config.model = model;
  }
}

module.exports = LLMService;
