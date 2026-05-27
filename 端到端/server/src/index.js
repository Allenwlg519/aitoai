/**
 * 应用入口
 * 职责: 初始化 Express 应用、挂载中间件、启动 HTTP + WebSocket 服务
 */
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');
const { initWebSocketServer } = require('./ws');
const config = require('./config');
const { initDefaultTools } = require('./core/tool');
const SandboxManager = require('./core/sandbox-manager');
const agentService = require('./services/agent.service');
const projectService = require('./services/project.service');
const logger = require('./utils/logger');

const app = express();

// ---- 中间件挂载 ----
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- 健康检查端点 ----
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ---- 初始化 Docker 沙箱管理器 ----
const sandboxManager = new SandboxManager();
logger.info('SandboxManager 已初始化');

// ---- 初始化默认工具（含 ShellTool） ----
const workspaceRoot = config.workspace.root;
fs.mkdirSync(workspaceRoot, { recursive: true });

initDefaultTools({ sandboxManager });
logger.info('默认工具已注册', { workspaceRoot });

// ---- 初始化 Agent 服务 ----
agentService.init(sandboxManager);

// ---- 创建 HTTP 服务并绑定 WebSocket ----
const server = createServer(app);
initWebSocketServer(server);

// ---- 启动 ----
server.listen(config.port, () => {
  logger.info(`服务已启动，端口: ${config.port}`);
});

module.exports = { app, server };
