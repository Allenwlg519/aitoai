/**
 * WriteFileTool
 * 职责: 写入内容到工作区文件，自动创建父目录，路径沙箱在 /workspace 下
 */
const path = require('path');
const fs = require('fs');
const BaseTool = require('../core/base-tool');

class WriteFileTool extends BaseTool {
  /**
   * @param {string} workspaceRoot - 工作区根目录绝对路径
   */
  constructor(workspaceRoot) {
    super();
    this.workspaceRoot = workspaceRoot;
  }

  get name() {
    return 'write_file';
  }

  get description() {
    return '写入内容到工作区中的文件，若目录不存在则自动创建';
  }

  get parameters() {
    return {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（相对于工作区）',
        },
        content: {
          type: 'string',
          description: '文件内容',
        },
      },
      required: ['path', 'content'],
    };
  }

  /**
   * 执行写入文件
   * @param {{ path: string, content: string }} params
   * @returns {Promise<string>} 写入成功消息
   */
  async execute(params) {
    const safePath = this._resolvePath(params.path);

    // 自动创建父目录
    const dir = path.dirname(safePath);
    await fs.promises.mkdir(dir, { recursive: true });

    await fs.promises.writeFile(safePath, params.content, 'utf-8');
    return `文件已写入: ${params.path}`;
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

module.exports = WriteFileTool;
