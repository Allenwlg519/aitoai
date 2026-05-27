/**
 * ShellTool
 * 职责: 在 Docker 沙箱中执行 Shell 命令
 *       通过 SandboxManager 实现隔离执行
 *       支持逐行输出回调（流向终端组件）
 */
const BaseTool = require('../core/base-tool');

class ShellTool extends BaseTool {
  /**
   * @param {object} sandboxManager - SandboxManager 实例
   * @param {function} outputCallback - (sessionId, line, type) => void
   */
  constructor(sandboxManager, outputCallback) {
    super();
    this.sandboxManager = sandboxManager;
    this.outputCallback = outputCallback || (() => {});
  }

  get name() {
    return 'shell';
  }

  get description() {
    return '在 Docker 沙箱中执行 Shell 命令，返回命令输出结果';
  }

  get parameters() {
    return {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的 Shell 命令',
        },
      },
      required: ['command'],
    };
  }

  /**
   * 执行 Shell 命令
   * @param {object} params - { command }
   * @param {object} context - { sessionId }
   * @returns {Promise<string>} 执行结果文本
   */
  async execute(params, context = {}) {
    const { command } = params;
    const sessionId = context.sessionId || 'unknown';

    if (!command || typeof command !== 'string') {
      throw new Error('缺少有效的 command 参数');
    }

    const onLine = (line, type) => {
      this.outputCallback(sessionId, line, type);
    };

    const result = await this.sandboxManager.executeCommand(
      sessionId,
      command,
      onLine,
    );

    const outputParts = [];
    if (result.stdout) outputParts.push(result.stdout);
    if (result.stderr) outputParts.push(`STDERR:\n${result.stderr}`);
    outputParts.push(`\n退出码: ${result.exitCode}`);

    return outputParts.join('\n');
  }
}

module.exports = ShellTool;
