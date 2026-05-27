/**
 * ReadFileTool
 * 职责: 读取工作区文件，路径沙箱在 /workspace 下防止越权
 */
const path = require('path');
const fs = require('fs');
const BaseTool = require('../core/base-tool');

class ReadFileTool extends BaseTool {
  /**
   * @param {string} workspaceRoot - 工作区根目录绝对路径
   */
  constructor(workspaceRoot) {
    super();
    this.workspaceRoot = workspaceRoot;
  }

  get name() {
    return 'read_file';
  }

  get description() {
    return '读取工作区中的文件内容，返回文件文本';
  }

  get parameters() {
    return {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（相对于工作区）',
        },
      },
      required: ['path'],
    };
  }

  /**
   * 执行读取文件
   * @param {{ path: string }} params
   * @returns {Promise<string>} 文件内容
   */
  async execute(params) {
    const safePath = this._resolvePath(params.path);
    const content = await fs.promises.readFile(safePath, 'utf-8');
    return content;
  }

  /**
   * 解析并校验路径，防止目录穿越
   * @param {string} userPath
   * @returns {string} 沙箱内绝对路径
   */
  _resolvePath(userPath) {
    const normalized = path.normalize(userPath);
    const resolved = path.resolve(this.workspaceRoot, normalized);

    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error(`路径越权: ${userPath}`);
    }

    return resolved;
  }
}

module.exports = ReadFileTool;
