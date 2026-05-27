/**
 * Agent 核心
 * 职责: 智能体主循环（感知 → 规划 → 执行 → 观察）
 *       管理上下文窗口、工具调用编排、步骤追踪
 */

const EventEmitter = require('events');

/** Agent 状态枚举 */
const AgentState = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
});

class AgentCore extends EventEmitter {
  /**
   * @param {object} options
   * @param {string} options.id - Agent 唯一标识
   * @param {object} options.llm - LLM 接口实例
   * @param {object[]} options.tools - 可用工具列表
   */
  constructor(options) {
    super();
    this.id = options.id;
    this.llm = options.llm;
    this.tools = options.tools || [];
    this.state = AgentState.IDLE;
    this.context = []; // 对话/执行上下文
    this.steps = [];   // 执行步骤记录
  }

  /**
   * 启动 Agent 执行
   * @param {object} task - { instruction, files, options }
   */
  async run(task) {
    // TODO: 状态切换至 RUNNING
    // TODO: 将 task 注入上下文
    // TODO: 主循环: 调用 LLM → 解析响应 → 执行工具 → 观察结果 → 循环
    // TODO: 通过 emit 发送状态、日志、中间结果
    // TODO: 完成后切换至 COMPLETED
    this.state = AgentState.RUNNING;
    this.emit('status', { agentId: this.id, state: this.state });
  }

  /**
   * 暂停执行（等待当前步骤完成）
   */
  pause() {
    // TODO: 设置暂停标志，当前步骤完成后停止
    this.state = AgentState.PAUSED;
    this.emit('status', { agentId: this.id, state: this.state });
  }

  /**
   * 恢复执行
   */
  resume() {
    // TODO: 清除暂停标志，继续主循环
    this.state = AgentState.RUNNING;
    this.emit('status', { agentId: this.id, state: this.state });
  }

  /**
   * 停止执行
   */
  stop() {
    // TODO: 设置停止标志，清理资源
    this.state = AgentState.COMPLETED;
    this.emit('status', { agentId: this.id, state: this.state });
  }

  /**
   * 向 Agent 上下文注入新消息（来自用户）
   * @param {string} content - 消息内容
   */
  async sendMessage(content) {
    // TODO: 追加用户消息到上下文，触发新一轮执行
  }
}

module.exports = AgentCore;
