/**
 * MockLLMService
 * 职责: 模拟 LLM 的 ReAct 响应，用于测试 Agent 闭环
 *       保留与 LLMService 相同的 chat/chatStream 接口签名
 *       方便后续替换为真实 LLM 接入
 *
 * 行为:
 *   turn 1 → 返回 thought + tool_call (write_file 创建 index.html)
 *   turn 2 → 返回 thought + final (任务完成)
 *   turn 3+ → 返回 thought + final (不再调用工具)
 */
class MockLLMService {
  constructor() {
    this.turnCount = 0;
  }

  /**
   * 模拟 LLM chat 响应
   * @param {Array<{ role: string, content: string }>} messages - 消息历史
   * @returns {Promise<string>} JSON 字符串，包含 thought / toolCall / final
   */
  async chat(messages) {
    this.turnCount++;

    // 从最后一条消息判断是否包含 tool 执行结果
    const lastMsg = messages[messages.length - 1];
    const hasToolResult = lastMsg && lastMsg.role === 'tool';

    if (hasToolResult || this.turnCount > 1) {
      // 后续轮次: 返回最终结果
      return JSON.stringify({
        thought: '工具执行成功，任务已完成。',
        final: '已成功创建文件，任务完成。',
      });
    }

    // 第一轮: 返回思考 + 工具调用
    return JSON.stringify({
      thought: '用户请求创建一个 index.html 文件。我将使用 write_file 工具来创建它。',
      toolCall: {
        name: 'write_file',
        arguments: {
          path: 'index.html',
          content:
            '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Hello World</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n  <p>这是一个由 AI Agent 创建的文件。</p>\n</body>\n</html>',
        },
      },
    });
  }

  /**
   * 模拟 LLM 流式响应（接口桩）
   * @param {Array} messages
   * @param {object} options
   * @param {function} onChunk - 流式回调
   * @returns {Promise<string>} 完整响应文本
   */
  async chatStream(messages, options, onChunk) {
    const full = await this.chat(messages);
    // 模拟逐块推送
    const chunkSize = 10;
    for (let i = 0; i < full.length; i += chunkSize) {
      const chunk = full.slice(i, i + chunkSize);
      if (onChunk) onChunk(chunk);
    }
    return full;
  }
}

module.exports = MockLLMService;
