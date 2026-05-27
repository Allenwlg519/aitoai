/**
 * BaseTool 抽象基类
 * 职责: 定义工具的标准化接口
 *   - name: string          — 工具名称（唯一标识）
 *   - description: string   — 工具描述
 *   - parameters: object    — JSON Schema 格式的参数定义
 *   - execute(params)       — 异步执行方法，返回 string
 */
class BaseTool {
  get name() {
    throw new Error('子类必须实现 name getter');
  }

  get description() {
    throw new Error('子类必须实现 description getter');
  }

  get parameters() {
    throw new Error('子类必须实现 parameters getter');
  }

  /**
   * 执行工具
   * @param {object} params - 符合 parameters JSON Schema 的参数
   * @returns {Promise<string>} 执行结果文本
   */
  async execute(params) {
    throw new Error('子类必须实现 execute 方法');
  }

  /**
   * 转换为注册表兼容的对象格式
   * @returns {{ name: string, description: string, inputSchema: object, handler: function }}
   */
  toDefinition() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.parameters,
      handler: this.execute.bind(this),
    };
  }
}

module.exports = BaseTool;
