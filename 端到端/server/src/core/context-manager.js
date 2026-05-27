/**
 * ContextManager
 * 职责: 智能上下文组装
 *   - 扫描项目目录，生成文件树摘要 (≤500字符)
 *   - 关键词匹配，从历史中检索最相关的 3 个文件片段
 *   - 历史压缩（超过 20 轮时自动压缩前 10 轮）
 *   - 组装结构化 prompt: [系统指令] + [项目结构] + [相关代码] + [对话历史] + [当前问题]
 */
const fs = require('fs');
const path = require('path');

/** 忽略的目录名 */
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__', '.cache',
]);

/** 默认压缩阈值（轮数） */
const DEFAULT_MAX_TURNS = 20;

class ContextManager {
  /**
   * 构建 Agent 上下文
   * @param {string} userMessage - 用户输入
   * @param {object[]} sessionHistory - 会话消息历史（完整消息对象数组）
   * @param {string} projectPath - 项目根目录路径
   * @returns {Promise<Array<{ role: string, content: string }>>} 组装后的消息列表
   */
  async buildContext(userMessage, sessionHistory, projectPath) {
    // 1. 扫描项目目录
    const fileTree = await this._scanProject(projectPath);

    // 2. 关键词检索相关代码片段
    const snippets = this._retrieveRelevantSnippets(userMessage, sessionHistory);

    // 3. 压缩历史
    const compressedHistory = this._compressHistory(sessionHistory, DEFAULT_MAX_TURNS);

    // 4. 组装系统指令
    const systemParts = ['你是一个智能编程助手。'];

    if (fileTree) {
      systemParts.push(`\n## 项目结构\n\`\`\`\n${fileTree}\n\`\`\``);
    }

    if (snippets.length > 0) {
      systemParts.push(`\n## 相关代码片段\n${snippets.join('\n\n---\n\n')}`);
    }

    const systemContent = systemParts.join('\n');

    // 5. 组装最终消息列表
    const messages = [{ role: 'system', content: systemContent }];

    // 追加压缩后的历史（已格式化为 { role, content } 数组）
    for (const msg of compressedHistory) {
      messages.push(msg);
    }

    // 追加当前问题
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * 递归扫描项目目录，生成紧凑文件树摘要
   * @param {string} projectPath
   * @returns {Promise<string>} 树形文本，≤500 字符
   */
  async _scanProject(projectPath) {
    if (!projectPath || !fs.existsSync(projectPath)) {
      return '';
    }

    const rootName = path.basename(projectPath) || 'workspace';
    const lines = [];
    const MAX_LENGTH = 500;

    try {
      await this._walkTree(projectPath, '', lines, MAX_LENGTH);
    } catch {
      return '';
    }

    if (lines.length === 0) return rootName;

    let result = `${rootName}/\n${lines.join('\n')}`;
    if (result.length > MAX_LENGTH) {
      result = result.slice(0, MAX_LENGTH - 15) + '\n...(truncated)';
    }
    return result;
  }

  /**
   * 递归遍历目录树
   * @param {string} dirPath
   * @param {string} prefix - 当前行的前缀空白
   * @param {string[]} lines - 收集结果
   * @param {number} maxLen - 提前截断阈值
   */
  async _walkTree(dirPath, prefix, lines, maxLen) {
    let entries;
    try {
      entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    // 排序：目录在前，文件在后，各按名称排序
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (IGNORE_DIRS.has(entry.name)) continue;

      const isLast = i === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';

      if (entry.isDirectory()) {
        lines.push(`${prefix}${connector}${entry.name}/`);
        const nextPrefix = isLast ? `${prefix}    ` : `${prefix}│   `;
        // 检查是否已超长，超长则停止递归
        if (lines.join('\n').length < maxLen) {
          await this._walkTree(
            path.join(dirPath, entry.name),
            nextPrefix,
            lines,
            maxLen,
          );
        }
      } else {
        let fileSize = '';
        try {
          const stat = await fs.promises.stat(path.join(dirPath, entry.name));
          fileSize = ` (${this._formatSize(stat.size)})`;
        } catch {
          // stat 失败时跳过大小显示
        }
        lines.push(`${prefix}${connector}${entry.name}${fileSize}`);
      }

      // 总量超长时提前停止
      if (lines.join('\n').length >= maxLen) {
        return;
      }
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes
   * @returns {string}
   */
  _formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  /**
   * 从会话历史中检索与当前问题最相关的代码片段
   * @param {string} userMessage - 用户输入
   * @param {object[]} sessionHistory - 消息历史
   * @returns {string[]} 最多 3 个片段文本
   */
  _retrieveRelevantSnippets(userMessage, sessionHistory) {
    if (!userMessage || !sessionHistory || sessionHistory.length === 0) {
      return [];
    }

    // 提取关键词（按中英文空格、标点拆分）
    const keywords = userMessage
      .toLowerCase()
      .split(/[\s,，。.、！？!?；;：:（）()\[\]【】{}"'"]+/)
      .filter((w) => w.length >= 2) // 过短的单字过滤
      .filter((w) => !['这个', '那个', '什么', '怎么', '如何', '一个', '可以', '需要', '文件', '代码'].includes(w));

    if (keywords.length === 0) return [];

    // 在历史中搜索 agent_thought 和 tool_result 类型消息
    const candidates = [];
    for (const msg of sessionHistory) {
      const type = msg.type || '';
      if (type !== 'agent_thought' && type !== 'tool_result') continue;

      const content = this._extractText(msg);
      if (!content) continue;

      // 计算关键词命中数
      const lower = content.toLowerCase();
      let hits = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) hits++;
      }

      if (hits > 0) {
        candidates.push({
          score: hits,
          snippet: `${type}: ${content.slice(0, 200)}`,
        });
      }
    }

    // 按评分降序取前 3
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 3).map((c) => c.snippet);
  }

  /**
   * 从消息对象中提取文本内容
   * @param {object} msg
   * @returns {string}
   */
  _extractText(msg) {
    const payload = msg.payload;
    if (!payload) return '';
    return payload.content || payload.output || payload.error || '';
  }

  /**
   * 压缩历史消息
   * 当总轮数超过 maxTurns 时，将前一半轮次压缩为摘要
   * @param {object[]} sessionHistory - 原始消息历史
   * @param {number} maxTurns - 触发压缩的轮数阈值
   * @returns {Array<{ role: string, content: string }>} 压缩后的消息列表
   */
  _compressHistory(sessionHistory, maxTurns = DEFAULT_MAX_TURNS) {
    if (!sessionHistory || sessionHistory.length === 0) return [];

    // 将消息按 user_message 分组，统计轮数
    const turns = this._groupByTurns(sessionHistory);
    const totalTurns = turns.length;

    // 低于阈值 → 直接转换为 { role, content } 格式返回
    if (totalTurns <= maxTurns) {
      return this._toRoleMessages(sessionHistory);
    }

    // 超过阈值 → 压缩前半部分
    const compressCount = Math.floor(maxTurns / 2); // 压缩前 compressCount 轮
    const keepCount = maxTurns - compressCount; // 保留后 keepCount 轮

    const compressTurns = turns.slice(0, compressCount);
    const keepTurns = turns.slice(totalTurns - keepCount);

    // 生成摘要
    const summaryLines = [];
    for (let i = 0; i < compressTurns.length; i++) {
      const turn = compressTurns[i];
      const userMsg = turn.find((m) => m.type === 'user_message');
      const toolCalls = turn
        .filter((m) => m.type === 'tool_call')
        .map((m) => m.payload?.toolName || 'tool')
        .join(', ');
      const completed = turn.find((m) => m.type === 'agent:completed');
      const agentSummary = completed?.payload?.summary || '';

      const parts = [`[第${i + 1}轮]`];
      if (userMsg) {
        parts.push(`用户: ${this._extractText(userMsg).slice(0, 50)}`);
      }
      if (toolCalls) {
        parts.push(`[${toolCalls}]`);
      }
      if (agentSummary) {
        parts.push(`完成: ${agentSummary.slice(0, 80)}`);
      }
      summaryLines.push(parts.join(' → '));
    }

    const summaryText = `以下为早期对话摘要（共${compressTurns.length}轮）：\n${summaryLines.join('\n')}`;

    // 组装最终消息列表
    const result = [{ role: 'system', content: `## 对话历史摘要\n${summaryText}` }];

    // 追加保留的最近轮次
    for (const turn of keepTurns) {
      for (const msg of turn) {
        const roleMsg = this._toRoleMessage(msg);
        if (roleMsg) result.push(roleMsg);
      }
    }

    return result;
  }

  /**
   * 按 user_message 对消息进行分组
   * @param {object[]} messages
   * @returns {Array<object[]>}
   */
  _groupByTurns(messages) {
    const turns = [];
    let currentTurn = [];

    // 从 session_init 或最早消息开始
    for (const msg of messages) {
      if (msg.type === 'user_message' && currentTurn.length > 0) {
        turns.push(currentTurn);
        currentTurn = [msg];
      } else {
        currentTurn.push(msg);
      }
    }
    if (currentTurn.length > 0) {
      turns.push(currentTurn);
    }

    return turns;
  }

  /**
   * 将消息对象转为 { role, content } 格式
   * @param {object} msg
   * @returns {{ role: string, content: string }|null}
   */
  _toRoleMessage(msg) {
    const type = msg.type;
    const text = this._extractText(msg);
    if (!text && type !== 'tool_call') return null;

    switch (type) {
      case 'user_message':
        return { role: 'user', content: text || '' };
      case 'agent_thought':
        return { role: 'assistant', content: text || '' };
      case 'tool_call':
        return {
          role: 'assistant',
          content: `[调用工具 ${msg.payload?.toolName}]`,
        };
      case 'tool_result':
        return { role: 'tool', content: text || '' };
      case 'agent:completed':
        return { role: 'assistant', content: `[完成] ${msg.payload?.summary || ''}` };
      default:
        return null;
    }
  }

  /**
   * 批量转换为 { role, content }
   * @param {object[]} messages
   * @returns {Array<{ role: string, content: string }>}
   */
  _toRoleMessages(messages) {
    const result = [];
    for (const msg of messages) {
      const m = this._toRoleMessage(msg);
      if (m) result.push(m);
    }
    return result;
  }
}

module.exports = ContextManager;
