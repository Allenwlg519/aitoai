import { config } from '../config';
import { logger } from '../utils';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DoubaoService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.doubao.apiKey;
    this.baseUrl = config.doubao.baseUrl;
    this.model = config.doubao.model;
  }

  async chatCompletion(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('未配置豆包API密钥');
    }

    try {
      const requestBody = {
        model: this.model,
        messages
      };
      
      logger.info('发送豆包API请求', { url: `${this.baseUrl}/chat/completions`, body: JSON.stringify(requestBody) });
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      logger.info('豆包API响应状态', { status: response.status, statusText: response.statusText });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('豆包API错误响应', { error: errorData });
        throw new Error(`API调用失败: ${errorData.error?.message || response.status}`);
      }

      const data: ChatCompletionResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error('豆包API调用失败', error);
      throw error;
    }
  }

  async parseRequirements(requirements: string): Promise<string> {
    const systemPrompt = `你是一个专业的需求分析师。请将用户的需求分解成结构化的任务列表。
请以JSON格式返回，包含tasks数组，每个任务包含：
- id: 任务ID
- title: 任务标题
- description: 任务描述
- priority: 优先级（high/medium/low）

只返回JSON，不要包含其他文字。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: requirements }
    ];

    return this.chatCompletion(messages);
  }

  async designArchitecture(requirements: string): Promise<string> {
    const systemPrompt = `你是一个专业的架构设计师。请根据需求设计完整的技术架构。
请以JSON格式返回，包含：
- techStack: { frontend: string, backend: string, database: string }
- database: { tables: [{ name: string, columns: [{ name, type, primaryKey, nullable }] }] }
- apis: [{ method, endpoint, description }]
- mermaidDiagram: Mermaid格式的架构图

只返回JSON，不要包含其他文字。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: requirements }
    ];

    return this.chatCompletion(messages);
  }

  async generateCode(requirements: string, techStack: any): Promise<string> {
    const systemPrompt = `你是一个全栈开发专家。请根据需求和技术栈生成完整的代码。
请生成包含以下内容的完整项目代码：
1. package.json（包含所有依赖）
2. 后端代码（使用Express）
3. 前端代码（使用React）
4. 数据库初始化脚本

请以JSON格式返回，格式：
{
  "files": [
    { "path": "文件路径", "content": "文件内容" }
  ]
}

只返回JSON，不要包含其他文字。`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `需求：${requirements}\n技术栈：${JSON.stringify(techStack)}` }
    ];

    return this.chatCompletion(messages);
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    return this.chatCompletion(messages);
  }

  async modifyCode(userRequest: string, currentFiles: { path: string; content: string }[]): Promise<{ response: string; modifiedFiles: { path: string; content: string }[] }> {
    const filesContext = currentFiles.map(f => `【文件: ${f.path}】\n${f.content}`).join('\n\n');

    const systemPrompt = `你是一个专业的代码修改助手。用户会给你当前项目的代码和修改需求。
你需要：
1. 理解用户的修改需求
2. 如果需要修改代码，以JSON格式返回修改后的文件：
{
  "response": "对用户需求的解释和说明",
  "modifiedFiles": [
    { "path": "文件路径", "content": "修改后的文件内容" }
  ]
}
3. 如果只需要解释或回答问题，response字段包含你的回复，modifiedFiles为空数组[]

只返回JSON，不要包含其他文字。`;

    const userContent = `当前项目文件：\n${filesContext}\n\n用户需求：${userRequest}`;

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    const result = await this.chatCompletion(chatMessages);

    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : result.trim();
      const parsed = JSON.parse(jsonStr);
      return {
        response: parsed.response || result,
        modifiedFiles: parsed.modifiedFiles || []
      };
    } catch {
      return { response: result, modifiedFiles: [] };
    }
  }
}

export const createDoubaoService = (apiKey?: string) => new DoubaoService(apiKey);
