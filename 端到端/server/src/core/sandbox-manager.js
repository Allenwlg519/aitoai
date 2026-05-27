/**
 * SandboxManager
 * 职责: 通过 dockerode 管理 Docker 容器的生命周期
 *       提供会话级别的沙箱隔离，每个 session 对应一个容器
 *       支持惰性创建、命令执行（逐行回调）、清理销毁
 */
const Dockerode = require('dockerode');
const config = require('../config');
const logger = require('../utils/logger');

/** 默认镜像名 */
const DEFAULT_IMAGE = 'node:20-alpine';

class SandboxManager {
  constructor() {
    this.docker = new Dockerode();
    this.containers = new Map(); // sessionId → { container, workDir }
    this.IMAGE = DEFAULT_IMAGE;
  }

  /**
   * 为指定 session 创建容器（惰性）
   * 如果容器已存在则直接返回
   * @param {string} sessionId
   * @returns {Promise<{containerId: string, workDir: string}>}
   */
  async createSandbox(sessionId) {
    if (this.containers.has(sessionId)) {
      return this.containers.get(sessionId);
    }

    const workDir = config.workspace.root;
    const hostConfig = {
      Binds: [`${workDir}:${workDir}`],
      WorkingDir: workDir,
      AutoRemove: true,
    };

    try {
      const container = await this.docker.createContainer({
        Image: this.IMAGE,
        Cmd: ['sleep', 'infinity'],
        HostConfig: hostConfig,
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        OpenStdin: false,
      });

      await container.start();
      const info = { container, containerId: container.id, workDir };
      this.containers.set(sessionId, info);

      logger.info('Docker 沙箱容器已创建', { sessionId, containerId: container.id });
      return info;
    } catch (err) {
      logger.error('创建 Docker 沙箱失败', { sessionId, error: err.message });
      throw new Error(`创建沙箱失败: ${err.message}`);
    }
  }

  /**
   * 在会话容器内执行命令，逐行回调输出
   * 首次调用时自动创建容器
   * @param {string} sessionId
   * @param {string} command - 要执行的 Shell 命令
   * @param {function} onLine - (text: string, type: 'stdout'|'stderr') => void
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
   */
  async executeCommand(sessionId, command, onLine) {
    // 惰性创建
    const sandbox = await this.createSandbox(sessionId);
    const { container } = sandbox;

    try {
      const exec = await container.exec({
        Cmd: ['sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Tty: false, Detach: false });
      const { output, errorOutput } = await this._streamOutput(stream, onLine);

      // 等待执行完成获取退出码
      const inspect = await exec.inspect();
      const exitCode = inspect.ExitCode;

      logger.debug('Shell 命令执行完成', { sessionId, command, exitCode });
      return { stdout: output, stderr: errorOutput, exitCode };
    } catch (err) {
      logger.error('Shell 命令执行失败', { sessionId, command, error: err.message });
      throw new Error(`命令执行失败: ${err.message}`);
    }
  }

  /**
   * 处理 Docker 输出流，按行拆分并回调
   * @private
   */
  _streamOutput(stream, onLine) {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';
      let buffer = '';

      stream.on('data', (chunk) => {
        // Docker 多路复用帧: 8 字节头 + 数据
        // 帧头格式: [1byte type][3bytes padding][4bytes length]
        let offset = 0;
        const raw = chunk;
        while (offset < raw.length) {
          if (offset + 8 > raw.length) break;
          const type = raw[offset];
          const length = raw.readUInt32BE(offset + 4);
          offset += 8;
          if (offset + length > raw.length) break;
          const data = raw.slice(offset, offset + length).toString('utf-8');
          offset += length;

          const streamType = type === 2 ? 'stderr' : 'stdout';

          // 按行拆分并回调
          buffer += data;
          let nlIdx;
          while ((nlIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, nlIdx).replace(/\r$/, '');
            buffer = buffer.slice(nlIdx + 1);
            if (onLine && line.length > 0) {
              onLine(line, streamType);
            }
            if (streamType === 'stderr') {
              errorOutput += line + '\n';
            } else {
              output += line + '\n';
            }
          }
        }
      });

      stream.on('end', () => {
        // 处理最后的缓冲内容（无换行结尾）
        if (buffer.length > 0) {
          if (onLine) onLine(buffer, 'stdout');
          output += buffer + '\n';
        }
        resolve({ output, errorOutput });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 销毁会话容器
   * @param {string} sessionId
   */
  async destroySandbox(sessionId) {
    const sandbox = this.containers.get(sessionId);
    if (!sandbox) return;

    try {
      await sandbox.container.stop({ t: 2 }); // 2 秒超时
    } catch (err) {
      // 容器可能已停止
    }
    try {
      await sandbox.container.remove({ force: true });
    } catch (err) {
      // AutoRemove 可能已清理
    }
    this.containers.delete(sessionId);
    logger.info('Docker 沙箱容器已清理', { sessionId, containerId: sandbox.containerId });
  }

  /**
   * 清理所有会话容器
   */
  async destroyAll() {
    const keys = Array.from(this.containers.keys());
    await Promise.allSettled(keys.map((sid) => this.destroySandbox(sid)));
  }
}

module.exports = SandboxManager;
