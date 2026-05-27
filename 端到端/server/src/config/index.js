/**
 * 配置管理
 * 职责: 读取环境变量并提供默认值，导出单例配置对象
 */
const path = require('path');

// 尝试加载 .env 文件
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
} catch (_) {
  // .env 文件不存在时静默处理
}

const config = {
  /** 服务监听端口 */
  port: parseInt(process.env.PORT, 10) || 3001,

  /** 主机地址 */
  host: process.env.HOST || '0.0.0.0',

  /** CORS 配置 */
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  /** WebSocket 配置 */
  ws: {
    /** 心跳检测间隔 (毫秒) */
    heartbeatInterval: 30000,
    /** 客户端无响应超时 (毫秒) */
    heartbeatTimeout: 10000,
    /** 最大消息大小 (字节) */
    maxPayload: 10 * 1024 * 1024,
  },

  /** 日志级别: debug / info / warn / error */
  logLevel: process.env.LOG_LEVEL || 'info',

  /** 工作区路径（工具文件操作沙箱） */
  workspace: {
    root: process.env.WORKSPACE_ROOT || path.resolve(__dirname, '../../workspace'),
  },

  /** LLM 配置（留作后续扩展） */
  llm: {
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4',
  },
};

module.exports = config;
