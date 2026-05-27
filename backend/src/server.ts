import express from 'express';
import http from 'http';
import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config';
import { corsMiddleware, errorHandler, requestLogger } from './middleware';
import routes from './routes';
import { initDatabase, closeDatabase } from './database/connection';
import { logger } from './utils';
import { handleConnection } from './ws';

const app = express();
const server: HttpServer = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API接口不存在'
  });
});

app.use(errorHandler);

// WebSocket连接处理
wss.on('connection', (ws) => {
  handleConnection(ws);
});

export const broadcastProgress = (taskId: string, step: number, totalSteps: number, message: string, data?: any) => {
  const payload = JSON.stringify({
    taskId,
    progress: {
      step,
      totalSteps,
      percentage: Math.round((step / totalSteps) * 100),
      message,
      data
    }
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  });
};

const startServer = async () => {
  try {
    await initDatabase();

    server.listen(config.server.port, config.server.host, () => {
      logger.info(`服务器运行在端口 ${config.server.port}`, {
        host: config.server.host,
        env: config.env
      });
      logger.info('WebSocket服务器就绪');
    });
  } catch (error) {
    logger.error('服务器启动失败', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
  logger.info(`收到 ${signal} 信号，开始关闭服务器...`);

  server.close(async () => {
    await closeDatabase();
    logger.info('服务器已关闭');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('关闭超时，强制退出');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export { app, server };
