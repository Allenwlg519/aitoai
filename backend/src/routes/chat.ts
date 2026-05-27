import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getProject } from '../database';
import { createDoubaoService } from '../services/doubaoService';

export const chatRouter = express.Router();

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  taskId: string;
  message: string;
  history?: ChatMessage[];
}

interface FileInfo {
  path: string;
  content: string;
}

const getProjectFiles = (taskId: string): FileInfo[] => {
  const outputDir = path.join(__dirname, '..', '..', 'generated', taskId);
  const files: FileInfo[] = [];

  if (!fs.existsSync(outputDir)) {
    return files;
  }

  const readDir = (dir: string, basePath: string = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        readDir(fullPath, relativePath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            files.push({ path: relativePath.replace(/\\/g, '/'), content });
          } catch (e) {
            console.error(`读取文件失败: ${fullPath}`, e);
          }
        }
      }
    }
  };

  readDir(outputDir);
  return files;
};

chatRouter.post('/', async (req: Request, res: Response) => {
  const { taskId, message, history = [] }: ChatRequest = req.body;

  if (!taskId || !message) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '未配置豆包API密钥' });
  }

  try {
    const doubao = createDoubaoService(apiKey);

    // 通用对话模式：当taskId为'chat-only'时，直接进行通用聊天
    if (taskId === 'chat-only') {
      const allHistory: ChatMessage[] = [
        { role: 'system', content: '你是一个专业的AI编程助手，擅长帮助用户创建项目、编写代码和解答技术问题。' },
        ...history,
        { role: 'user', content: message }
      ];

      const response = await doubao.chat(allHistory);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };

      return res.json({
        response,
        modifiedFiles: [],
        history: [...history, { role: 'user' as const, content: message }, assistantMessage]
      });
    }

    const project = await getProject(taskId);

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const currentFiles = getProjectFiles(taskId);

    if (currentFiles.length > 0) {
      const result = await doubao.modifyCode(message, currentFiles);

      if (result.modifiedFiles.length > 0) {
        const outputDir = path.join(__dirname, '..', '..', 'generated', taskId);

        for (const file of result.modifiedFiles) {
          const filePath = path.join(outputDir, file.path);
          const fileDir = path.dirname(filePath);
          fs.mkdirSync(fileDir, { recursive: true });
          fs.writeFileSync(filePath, file.content, 'utf8');
        }
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.response
      };

      return res.json({
        response: result.response,
        modifiedFiles: result.modifiedFiles.map(f => f.path),
        history: [...history, { role: 'user' as const, content: message }, assistantMessage]
      });
    } else {
      const allHistory: ChatMessage[] = [
        { role: 'system', content: '你是一个智能助手，帮助用户解答问题和提供建议。当前没有已生成的项目代码。' },
        ...history,
        { role: 'user', content: message }
      ];

      const response = await doubao.chat(allHistory);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };

      return res.json({
        response,
        modifiedFiles: [],
        history: [...history, { role: 'user' as const, content: message }, assistantMessage]
      });
    }
  } catch (error: any) {
    console.error('聊天错误:', error);
    return res.status(500).json({ error: error.message || '聊天服务出错' });
  }
});

chatRouter.get('/files/:taskId', async (req: Request, res: Response) => {
  const { taskId } = req.params;

  if (!taskId) {
    return res.status(400).json({ error: '缺少taskId' });
  }

  try {
    const files = getProjectFiles(taskId);
    return res.json({ files });
  } catch (error: any) {
    console.error('获取文件列表错误:', error);
    return res.status(500).json({ error: error.message || '获取文件列表失败' });
  }
});
