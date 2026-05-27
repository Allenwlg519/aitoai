/**
 * Agent 服务
 * 职责: Agent 生命周期管理、事件 → WebSocket 消息映射
 *       持有 ContextManager 和 PermissionGuard 单例
 *       状态机: idle → running → paused ↔ running → completed | error
 */
const { v4: uuidv4 } = require('uuid');
const ReActAgent = require('../core/react-agent');
const MockLLMService = require('../core/mock-llm');
const ContextManager = require('../core/context-manager');
const PermissionGuard = require('../core/permission-guard');
const sessionManager = require('./session.service');
const { registerTool } = require('../core/tool');
const ShellTool = require('../tools/shell-tool');
const config = require('../config');
const logger = require('../utils/logger');

/** 单例 */
const contextManager = new ContextManager();
const permissionGuard = new PermissionGuard();

/** 活跃 Agent 实例映射表 */
const agents = new Map();

/** SandboxManager 实例（由 init() 注入） */
let sandboxManager = null;

/**
 * 初始化服务（注入 SandboxManager 并注册 ShellTool）
 * @param {object} sm - SandboxManager 实例
 */
function init(sm) {
  sandboxManager = sm;

  // outputCallback: ShellTool 每输出一行就推送到前端终端组件
  const outputCallback = (sessionId, line, type) => {
    const msg = {
      type: 'shell_output',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: { text: line, type },
    };
    sessionManager.send(sessionId, msg);
  };

  const shellTool = new ShellTool(sandboxManager, outputCallback);
  registerTool(shellTool.toDefinition());
  logger.info('ShellTool 已注册，Docker 沙箱就绪');
}

/**
 * 获取 PermissionGuard 单例
 * @returns {PermissionGuard}
 */
function getPermissionGuard() {
  return permissionGuard;
}

/**
 * 销毁会话的 Docker 沙箱
 * @param {string} sessionId
 */
function destroySandbox(sessionId) {
  if (sandboxManager) {
    sandboxManager.destroySandbox(sessionId).catch((err) => {
      logger.warn('销毁沙箱失败', { sessionId, error: err.message });
    });
  }
}

/**
 * 启动一个新的 Agent 任务
 * @param {object} params - { task, context, options }
 * @param {string} sessionId - 所属会话 ID
 * @returns {Promise<object>} 启动确认消息
 */
async function start(params, sessionId) {
  const agentId = `agent-${uuidv4().slice(0, 8)}`;
  const llm = new MockLLMService();
  const agent = new ReActAgent(llm, sessionId, {
    contextManager,
    permissionGuard,
  });

  agents.set(agentId, agent);

  // ---- 事件 → WebSocket 推送映射 ----

  agent.on('thought', (data) => {
    const msg = {
      type: 'agent_thought',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        agentId,
        step: data.step,
        title: data.title,
        content: data.content,
        status: 'completed',
      },
    };
    sessionManager.send(sessionId, msg);
    sessionManager.addMessage(sessionId, msg);
  });

  agent.on('tool_call', (data) => {
    const msg = {
      type: 'tool_call',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        agentId,
        toolName: data.toolName,
        arguments: data.arguments,
        status: 'pending',
      },
    };
    sessionManager.send(sessionId, msg);
    sessionManager.addMessage(sessionId, msg);
  });

  agent.on('permission_request', (data) => {
    const msg = {
      type: 'permission_request',
      id: data.toolCallId,
      timestamp: new Date().toISOString(),
      payload: {
        agentId,
        toolCallId: data.toolCallId,
        toolName: data.toolName,
        arguments: data.arguments,
      },
    };
    sessionManager.send(sessionId, msg);
    sessionManager.addMessage(sessionId, msg);
    logger.info('权限请求已推送', { agentId, sessionId, toolName: data.toolName });
  });

  agent.on('tool_result', (data) => {
    const msg = {
      type: 'tool_result',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        agentId,
        success: data.success,
        output: data.data || null,
        error: data.error || null,
      },
    };
    sessionManager.send(sessionId, msg);
    sessionManager.addMessage(sessionId, msg);
  });

  agent.on('code_diff', (data) => {
    const msg = {
      type: 'code_diff',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        agentId,
        title: data.title || '代码变更',
        oldContent: data.oldContent,
        newContent: data.newContent,
      },
    };
    sessionManager.send(sessionId, msg);
    sessionManager.addMessage(sessionId, msg);
  });

  agent.on('final', (data) => {
    // 发送最终思考消息
    const thoughtMsg = {
      type: 'agent_thought',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        agentId,
        step: agent.stepCount,
        title: '任务完成',
        content: data.content,
        status: 'completed',
      },
    };
    sessionManager.send(sessionId, thoughtMsg);
    sessionManager.addMessage(sessionId, thoughtMsg);

    // 发送完成通知
    const completedMsg = {
      type: 'agent:completed',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        agentId,
        summary: data.content,
        totalSteps: agent.stepCount,
      },
    };
    sessionManager.send(sessionId, completedMsg);
    sessionManager.addMessage(sessionId, completedMsg);

    logger.info('Agent 任务完成', { agentId, sessionId, steps: agent.stepCount });
  });

  agent.on('error', (data) => {
    const errorMsg = {
      type: 'error',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      payload: {
        code: 'AGENT_ERROR',
        message: data.message,
      },
    };
    sessionManager.send(sessionId, errorMsg);
    sessionManager.addMessage(sessionId, errorMsg);
    logger.error('Agent 错误', { agentId, sessionId, error: data.message });
  });

  // 异步启动 Agent 主循环（传入上下文选项）
  const taskContent = params.task || params.content || '';
  const sessionHistory = sessionManager.getHistory(sessionId);

  agent.run(taskContent, {
    sessionHistory,
    projectPath: config.workspace.root,
  }).catch((err) => {
    logger.error('Agent run 异常', { agentId, sessionId, error: err.message });
  });

  logger.info('Agent 任务已启动', { agentId, sessionId });
  return { agentId, status: 'running' };
}

/**
 * 停止指定 Agent
 * @param {string} agentId
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
async function stop(agentId, sessionId) {
  const agent = agents.get(agentId);
  if (agent) {
    agent.removeAllListeners();
    agents.delete(agentId);
    logger.info('Agent 已停止', { agentId, sessionId });
  }
  return { agentId, status: 'stopped' };
}

/**
 * 暂停指定 Agent
 * @param {string} agentId
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
async function pause(agentId, sessionId) {
  return { agentId, status: 'paused' };
}

/**
 * 恢复指定 Agent
 * @param {string} agentId
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
async function resume(agentId, sessionId) {
  return { agentId, status: 'running' };
}

/**
 * 向 Agent 发送用户消息
 * @param {object} payload - { agentId, content }
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
async function sendMessage(payload, sessionId) {
  const agentId = payload.agentId;
  const existing = agentId ? agents.get(agentId) : null;

  if (existing) {
    return { agentId, status: 'running', reply: '消息已转发' };
  }

  return start({ task: payload.content }, sessionId);
}

module.exports = {
  init,
  start,
  stop,
  pause,
  resume,
  sendMessage,
  getPermissionGuard,
  destroySandbox,
};
