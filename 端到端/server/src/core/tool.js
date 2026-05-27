/**
 * 工具注册与执行沙箱
 * 职责: 提供工具注册机制，每个工具包含 name/description/schema/handler
 *       执行时校验参数并在沙箱中运行
 */

const config = require('../config');
const BaseTool = require('./base-tool');
const ReadFileTool = require('../tools/read-file-tool');
const WriteFileTool = require('../tools/write-file-tool');
const ShellTool = require('../tools/shell-tool');

/** 全局工具注册表 */
const toolRegistry = new Map();

/**
 * 注册一个工具
 * @param {object} toolDef
 * @param {string} toolDef.name - 工具名称（唯一标识）
 * @param {string} toolDef.description - 工具描述
 * @param {object} toolDef.inputSchema - 输入参数的 JSON Schema
 * @param {function} toolDef.handler - 执行函数 async (params) => result
 */
function registerTool(toolDef) {
  toolRegistry.set(toolDef.name, toolDef);
}

/**
 * 批量注册工具
 * @param {object[]} tools - 工具定义数组
 */
function registerTools(tools) {
  for (const tool of tools) {
    registerTool(tool);
  }
}

/**
 * 初始化并注册默认工具（ReadFileTool / WriteFileTool / ShellTool）
 * 在服务启动时调用一次
 * @param {object} [extra] - { sandboxManager?, outputCallback? }
 */
function initDefaultTools(extra = {}) {
  const workspaceRoot = config.workspace.root;

  const tools = [
    new ReadFileTool(workspaceRoot),
    new WriteFileTool(workspaceRoot),
  ];

  // 如果提供了 sandboxManager 则注册 ShellTool
  if (extra.sandboxManager) {
    tools.push(new ShellTool(extra.sandboxManager, extra.outputCallback));
  }

  for (const tool of tools) {
    registerTool(tool.toDefinition());
  }
}

/**
 * 获取已注册的工具定义列表（供 LLM 函数调用使用）
 * @returns {object[]} 包含 name / description / inputSchema
 */
function getToolDefinitions() {
  const defs = [];
  for (const tool of toolRegistry.values()) {
    defs.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    });
  }
  return defs;
}

/**
 * 执行指定工具
 * @param {string} name - 工具名称
 * @param {object} params - 工具参数
 * @param {object} [context] - 执行上下文（如 { sessionId }）
 * @returns {Promise<string>} 工具执行结果文本
 */
async function executeTool(name, params, context = {}) {
  const tool = toolRegistry.get(name);
  if (!tool) {
    throw new Error(`工具未找到: "${name}"`);
  }

  return await tool.handler(params, context);
}

/**
 * 获取所有已注册的工具名列表
 * @returns {string[]}
 */
function getRegisteredToolNames() {
  return Array.from(toolRegistry.keys());
}

module.exports = {
  registerTool,
  registerTools,
  initDefaultTools,
  getToolDefinitions,
  executeTool,
  getRegisteredToolNames,
};
