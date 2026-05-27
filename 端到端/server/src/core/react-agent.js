/**
 * ReActAgent
 * 职责: 实现 ReAct（推理-行动-观察）智能体闭环
 *       整合 ContextManager 构建结构化上下文
 *       整合 PermissionGuard 对敏感工具调用进行用户审批
 *
 * 事件:
 *   thought({ step, title, content })              — 推理步骤
 *   tool_call({ toolName, arguments })               — 工具调用请求
 *   permission_request({ toolCallId, toolName, arguments }) — 权限审批请求
 *   tool_result({ success, data, error })            — 工具执行结果
 *   final({ content })                               — 最终响应
 *   error({ message })                               — 错误
 */
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { executeTool } = require('./tool');

/** 最大 ReAct 循环轮数 */
const MAX_STEPS = 10;

/** 需要用户审批的敏感工具名 */
const SENSITIVE_TOOLS = new Set(['write_file', 'shell']);

class ReActAgent extends EventEmitter {
  /**
   * @param {object} llmService - 实现 chat(messages) 接口的 LLM 服务
   * @param {string} sessionId - 所属会话 ID（用于日志/追踪）
   * @param {object} [options]
   * @param {object} [options.contextManager] - ContextManager 实例
   * @param {object} [options.permissionGuard] - PermissionGuard 实例
   */
  constructor(llmService, sessionId, options = {}) {
    super();
    this.llm = llmService;
    this.sessionId = sessionId;
    this.contextManager = options.contextManager || null;
    this.permissionGuard = options.permissionGuard || null;
    this.context = [];
    this.stepCount = 0;
  }

  /**
   * 启动 ReAct 主循环
   * @param {string} userMessage - 用户输入
   * @param {object} [opts]
   * @param {object[]} [opts.sessionHistory] - 会话历史（用于 ContextManager）
   * @param {string} [opts.projectPath] - 项目路径（用于 ContextManager）
   */
  async run(userMessage, opts = {}) {
    const { sessionHistory, projectPath } = opts;

    // 使用 ContextManager 构建结构化上下文
    if (this.contextManager) {
      try {
        this.context = await this.contextManager.buildContext(
          userMessage,
          sessionHistory || [],
          projectPath || '',
        );
      } catch (err) {
        // ContextManager 失败时降级
        this.context = [{ role: 'user', content: userMessage }];
      }
    } else {
      this.context = [{ role: 'user', content: userMessage }];
    }

    // ---- ReAct 循环 ----
    for (let i = 0; i < MAX_STEPS; i++) {
      this.stepCount = i + 1;

      try {
        // 1. 调用 LLM 推理
        const responseText = await this.llm.chat(this.context);
        let response;

        try {
          response = JSON.parse(responseText);
        } catch {
          this.emit('error', { message: `LLM 返回非 JSON 格式: ${responseText}` });
          return;
        }

        const { thought, toolCall, final } = response;

        // 2. 推送思考过程
        if (thought) {
          this.emit('thought', {
            step: this.stepCount,
            title: `步骤 ${this.stepCount}`,
            content: thought,
          });
        }

        // 3. 工具调用分支
        if (toolCall && toolCall.name) {
          this.emit('tool_call', {
            toolName: toolCall.name,
            arguments: toolCall.arguments,
          });

          // ---- PermissionGuard 审批 ----
          if (
            SENSITIVE_TOOLS.has(toolCall.name) &&
            this.permissionGuard
          ) {
            const toolCallId = uuidv4();

            this.emit('permission_request', {
              toolCallId,
              toolName: toolCall.name,
              arguments: toolCall.arguments,
            });

            const approved = await this.permissionGuard.requestPermission(
              this.sessionId,
              toolCallId,
              toolCall.name,
              toolCall.arguments,
            );

            if (!approved) {
              // 用户拒绝 → 跳过工具，通知 LLM
              this.context.push({ role: 'assistant', content: responseText });
              this.context.push({
                role: 'tool',
                content: '用户拒绝了该操作。',
              });

              this.emit('tool_result', {
                success: false,
                data: null,
                error: '用户拒绝',
              });
              continue;
            }
          }
          // ---- 审批结束 ----

          // 4. 执行工具
          try {
            const result = await executeTool(toolCall.name, toolCall.arguments, {
              sessionId: this.sessionId,
            });
            this.context.push({ role: 'assistant', content: responseText });
            this.context.push({ role: 'tool', content: result });

            this.emit('tool_result', {
              success: true,
              data: result,
              error: null,
            });
          } catch (err) {
            this.context.push({ role: 'assistant', content: responseText });
            this.context.push({
              role: 'tool',
              content: `错误: ${err.message}`,
            });

            this.emit('tool_result', {
              success: false,
              data: null,
              error: err.message,
            });
          }

          continue;
        }

        // 5. 无工具调用 = 最终响应
        this.emit('final', {
          content: final || thought || '任务完成。',
        });
        return;
      } catch (err) {
        this.emit('error', { message: `Agent 执行异常: ${err.message}` });
        return;
      }
    }

    // 达到最大轮数上限
    this.emit('error', {
      message: `已达最大迭代次数（${MAX_STEPS}），任务未完成`,
    });
  }
}

module.exports = ReActAgent;
