/**
 * Agent 服务
 * 职责: 实现 Agent 的核心业务逻辑
 */

import { logger } from '../utils';
import { DoubaoService } from './doubaoService';
import { sendAgentStatus, sendAgentLog, sendAgentMessage, sendCodeDiff, sendShellOutput } from '../ws';
import { getSession } from '../ws/handler';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Agent {
  id: string;
  sessionId: string;
  task: string;
  context: object;
  options: object;
  state: 'running' | 'paused' | 'completed' | 'error';
  createdAt: Date;
  messages: ChatMessage[];
}

const agents = new Map<string, Agent>();

/**
 * 启动 Agent
 */
export async function start(payload: { task: string; context?: object; options?: object }, sessionId: string) {
  const agentId = crypto.randomUUID();
  const agent: Agent = {
    id: agentId,
    sessionId,
    task: payload.task,
    context: payload.context || {},
    options: payload.options || {},
    state: 'running',
    createdAt: new Date(),
    messages: [],
  };

  agents.set(agentId, agent);
  logger.info('Agent创建成功', { agentId, task: payload.task });

  // 异步执行Agent任务
  executeAgent(agentId);

  return { agentId };
}

/**
 * 执行 Agent 任务
 */
async function executeAgent(agentId: string) {
  const agent = agents.get(agentId);
  if (!agent) return;

  const session = getSession(agent.sessionId);
  if (!session) {
    logger.error('会话不存在', { agentId, sessionId: agent.sessionId });
    return;
  }

  try {
    // 发送运行状态
    sendAgentStatus(session.ws, agentId, 'running');

    // 添加系统消息
    const systemMessage: ChatMessage = {
      role: 'system',
      content: '你是一个专业的AI编程助手，擅长帮助用户创建项目、编写代码和解答技术问题。',
    };

    // 添加用户消息
    const userMessage: ChatMessage = {
      role: 'user',
      content: agent.task,
    };

    // 发送日志
    sendAgentLog(session.ws, agentId, 'info', '正在处理请求...');

    // 调用豆包API
    const doubao = new DoubaoService();
    const messages: ChatMessage[] = [systemMessage, userMessage];
    const response = await doubao.chatCompletion(messages);

    // 发送结果
    sendAgentMessage(session.ws, agentId, response);
    sendAgentLog(session.ws, agentId, 'info', '任务完成');

    // 更新状态
    agent.state = 'completed';
    sendAgentStatus(session.ws, agentId, 'completed');

  } catch (error) {
    logger.error('Agent执行失败', { agentId, error });
    agent.state = 'error';
    sendAgentStatus(session.ws, agentId, 'error');
    sendAgentMessage(session.ws, agentId, `错误: ${(error as Error).message}`);
  }
}

/**
 * 停止 Agent
 */
export async function stop(agentId: string, sessionId: string) {
  const agent = agents.get(agentId);
  if (!agent) {
    throw new Error('Agent不存在');
  }

  if (agent.sessionId !== sessionId) {
    throw new Error('无权操作此Agent');
  }

  agent.state = 'completed';
  agents.delete(agentId);

  const session = getSession(sessionId);
  if (session) {
    sendAgentStatus(session.ws, agentId, 'completed');
  }

  logger.info('Agent已停止', { agentId });
}

/**
 * 暂停 Agent
 */
export async function pause(agentId: string, sessionId: string) {
  const agent = agents.get(agentId);
  if (!agent) {
    throw new Error('Agent不存在');
  }

  if (agent.sessionId !== sessionId) {
    throw new Error('无权操作此Agent');
  }

  agent.state = 'paused';

  const session = getSession(sessionId);
  if (session) {
    sendAgentStatus(session.ws, agentId, 'paused');
  }

  logger.info('Agent已暂停', { agentId });
}

/**
 * 恢复 Agent
 */
export async function resume(agentId: string, sessionId: string) {
  const agent = agents.get(agentId);
  if (!agent) {
    throw new Error('Agent不存在');
  }

  if (agent.sessionId !== sessionId) {
    throw new Error('无权操作此Agent');
  }

  agent.state = 'running';

  const session = getSession(sessionId);
  if (session) {
    sendAgentStatus(session.ws, agentId, 'running');
  }

  // 继续执行
  executeAgent(agentId);

  logger.info('Agent已恢复', { agentId });
}

/**
 * 发送消息给 Agent
 */
export async function sendMessage(payload: { agentId: string; content: string }, sessionId: string) {
  const agent = agents.get(payload.agentId);
  if (!agent) {
    throw new Error('Agent不存在');
  }

  if (agent.sessionId !== sessionId) {
    throw new Error('无权操作此Agent');
  }

  const session = getSession(sessionId);
  if (!session) {
    throw new Error('会话不存在');
  }

  try {
    // 调用豆包API
    const doubao = new DoubaoService();
    
    // 构建消息历史
    const history: ChatMessage[] = [
      { role: 'system', content: '你是一个专业的AI编程助手，擅长帮助用户创建项目、编写代码和解答技术问题。' },
      ...agent.messages,
      { role: 'user', content: payload.content },
    ];

    const response = await doubao.chatCompletion(history);

    // 保存消息
    agent.messages.push({ role: 'user' as const, content: payload.content });
    agent.messages.push({ role: 'assistant' as const, content: response });

    // 发送响应
    sendAgentMessage(session.ws, payload.agentId, response);

  } catch (error) {
    logger.error('Agent消息处理失败', { agentId: payload.agentId, error });
    sendAgentMessage(session.ws, payload.agentId, `错误: ${(error as Error).message}`);
  }
}

/**
 * 处理权限审批
 */
export async function handlePermission(payload: { toolCallId: string; approved: boolean; alwaysAllow?: boolean }, sessionId: string) {
  // TODO: 实现权限审批逻辑
  logger.info('权限审批处理', { sessionId, payload });
}

export const agentService = {
  start,
  stop,
  pause,
  resume,
  sendMessage,
  handlePermission,
};
