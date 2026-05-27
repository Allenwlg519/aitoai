import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createProject, updateProject } from '../database';
import { broadcastProgress } from '../server';
import { createDoubaoService } from '../services/doubaoService';

export const parseRouter = express.Router();

interface ParseRequest {
  requirements: string;
}

interface ParseResponse {
  taskId: string;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const getDefaultTasks = (requirements: string): Task[] => {
  if (requirements.includes('待办') || requirements.includes('todo')) {
    return [
      { id: '1', title: '需求分析', description: '分析待办系统核心需求', priority: 'high' },
      { id: '2', title: '技术选型', description: 'React + Node + SQLite', priority: 'high' },
      { id: '3', title: '数据库设计', description: '待办事项表（标题、描述、状态、优先级）', priority: 'high' },
      { id: '4', title: 'API设计', description: 'CRUD接口：GET/POST/PUT/DELETE /api/todos', priority: 'high' },
      { id: '5', title: '前端开发', description: '待办列表、添加、编辑、删除功能', priority: 'high' },
      { id: '6', title: '后端开发', description: '实现待办数据的增删改查', priority: 'high' },
      { id: '7', title: '测试部署', description: '验证功能并启动服务', priority: 'medium' }
    ];
  }

  if (requirements.includes('博客') || requirements.includes('blog')) {
    return [
      { id: '1', title: '需求分析', description: '分析博客系统核心需求', priority: 'high' },
      { id: '2', title: '技术选型', description: 'React + Node + SQLite', priority: 'high' },
      { id: '3', title: '数据库设计', description: '文章表、分类表、标签表', priority: 'high' },
      { id: '4', title: 'API设计', description: '文章CRUD、分类管理、标签管理', priority: 'high' },
      { id: '5', title: '前端开发', description: '首页列表、文章详情、编辑器', priority: 'high' },
      { id: '6', title: '后端开发', description: '实现博客API服务', priority: 'high' },
      { id: '7', title: '测试部署', description: '验证功能并启动服务', priority: 'medium' }
    ];
  }

  if (requirements.includes('商城') || requirements.includes('shop') || requirements.includes('购物')) {
    return [
      { id: '1', title: '需求分析', description: '分析电商系统核心需求', priority: 'high' },
      { id: '2', title: '技术选型', description: 'React + Node + SQLite', priority: 'high' },
      { id: '3', title: '数据库设计', description: '商品表、订单表、用户表、购物车表', priority: 'high' },
      { id: '4', title: 'API设计', description: '商品管理、订单管理、购物车接口', priority: 'high' },
      { id: '5', title: '前端开发', description: '商品列表、详情、购物车、订单页面', priority: 'high' },
      { id: '6', title: '后端开发', description: '实现电商API服务', priority: 'high' },
      { id: '7', title: '测试部署', description: '验证功能并启动服务', priority: 'medium' }
    ];
  }

  return [
    { id: '1', title: '需求分析', description: '分析用户需求，提取核心功能点', priority: 'high' },
    { id: '2', title: '技术选型', description: '选择合适的技术栈', priority: 'high' },
    { id: '3', title: '数据库设计', description: '设计数据库表结构', priority: 'high' },
    { id: '4', title: 'API设计', description: '设计RESTful API接口', priority: 'high' },
    { id: '5', title: '前端开发', description: '开发React前端页面', priority: 'high' },
    { id: '6', title: '后端开发', description: '开发Node.js后端服务', priority: 'high' },
    { id: '7', title: '测试部署', description: '测试并部署应用', priority: 'medium' }
  ];
};

const extractJsonFromMarkdown = (text: string): string => {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
};

const parseRequirements = async (requirements: string): Promise<Task[]> => {
  const apiKey = process.env.DOUBAO_API_KEY;

  if (!apiKey) {
    console.log('未配置豆包API密钥，使用默认模板');
    return getDefaultTasks(requirements);
  }

  try {
    const doubao = createDoubaoService(apiKey);
    const result = await doubao.parseRequirements(requirements);
    console.log('豆包API返回结果:', result);
    const cleanResult = extractJsonFromMarkdown(result);
    const parsed = JSON.parse(cleanResult);
    const tasks = parsed.tasks || [];
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.log('豆包API返回空结果，使用默认模板');
      return getDefaultTasks(requirements);
    }
    return tasks;
  } catch (error) {
    console.error('豆包AI调用失败:', error);
    return getDefaultTasks(requirements);
  }
};

parseRouter.post('/', async (req: Request, res: Response) => {
  const { requirements } = req.body as ParseRequest;
  
  if (!requirements || typeof requirements !== 'string') {
    return res.status(400).json({ error: 'Invalid requirements' });
  }

  const taskId = uuidv4();
  
  await createProject({
    id: taskId,
    name: requirements.substring(0, 50) + (requirements.length > 50 ? '...' : ''),
    requirements,
    status: 'parsing',
    progress: 10,
    designOutput: '',
    generatedCode: ''
  });

  broadcastProgress(taskId, 1, 4, '正在解析需求...');

  const tasks = await parseRequirements(requirements);

  await updateProject(taskId, { status: 'parsing', progress: 20 });
  broadcastProgress(taskId, 1, 4, '需求解析完成', { tasks });

  res.json({ taskId, tasks });
});