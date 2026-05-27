import { ProjectModel, Project } from '../database/projectModel';
import { DoubaoService, createDoubaoService } from './doubaoService';
import { logger } from '../utils';
import { config } from '../config';

interface ParsedTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface DesignOutput {
  techStack: {
    frontend: string;
    backend: string;
    database: string;
  };
  database: {
    tables: {
      name: string;
      columns: {
        name: string;
        type: string;
        primaryKey: boolean;
        nullable: boolean;
      }[];
    }[];
  };
  apis: {
    method: string;
    endpoint: string;
    description: string;
  }[];
  mermaidDiagram: string;
}

const getDefaultTasks = (requirements: string): ParsedTask[] => {
  const taskTemplates = [
    { title: '需求分析', description: '分析项目需求并制定计划', priority: 'high' as const },
    { title: '数据库设计', description: '设计数据库表结构', priority: 'high' as const },
    { title: '后端开发', description: '实现后端API接口', priority: 'high' as const },
    { title: '前端开发', description: '实现前端界面', priority: 'medium' as const },
    { title: '功能测试', description: '测试项目功能', priority: 'medium' as const },
    { title: '部署上线', description: '部署项目到生产环境', priority: 'low' as const }
  ];

  return taskTemplates.map((task, index) => ({
    id: `task-${index + 1}`,
    title: task.title,
    description: task.description,
    priority: task.priority
  }));
};

const getDefaultDesign = (requirements: string): DesignOutput => ({
  techStack: {
    frontend: 'React + TypeScript + Ant Design',
    backend: 'Node.js + Express',
    database: 'MySQL'
  },
  database: {
    tables: [
      {
        name: 'items',
        columns: [
          { name: 'id', type: 'INT', primaryKey: true, nullable: false },
          { name: 'name', type: 'VARCHAR(255)', primaryKey: false, nullable: false },
          { name: 'description', type: 'TEXT', primaryKey: false, nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false },
          { name: 'updated_at', type: 'TIMESTAMP', primaryKey: false, nullable: false }
        ]
      }
    ]
  },
  apis: [
    { method: 'GET', endpoint: '/api/items', description: '获取列表' },
    { method: 'POST', endpoint: '/api/items', description: '创建项目' },
    { method: 'PUT', endpoint: '/api/items/:id', description: '更新项目' },
    { method: 'DELETE', endpoint: '/api/items/:id', description: '删除项目' }
  ],
  mermaidDiagram: `graph TD
    A[用户] --> B[前端 React]
    B --> C[后端 Express]
    C --> D[MySQL数据库]
    style D fill:#f9d71c`
});

export class ProjectService {
  private doubaoService: DoubaoService;

  constructor(doubaoService?: DoubaoService) {
    this.doubaoService = doubaoService || createDoubaoService();
  }

  async createProject(userId: number, requirements: string, name?: string): Promise<Project | null> {
    const projectName = name || requirements.substring(0, 50) + (requirements.length > 50 ? '...' : '');

    const project = await ProjectModel.create({
      id: this.generateId(),
      user_id: userId,
      name: projectName,
      requirements,
      status: 'parsing'
    });

    logger.info('项目创建成功', { projectId: project?.id, userId });
    return project;
  }

  async parseRequirements(projectId: string): Promise<ParsedTask[]> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }

    if (!config.doubao.apiKey) {
      logger.warn('未配置豆包API密钥，使用默认任务模板');
      const tasks = getDefaultTasks(project.requirements);
      await ProjectModel.update(projectId, { parsed_tasks: JSON.stringify(tasks), status: 'parsed' });
      return tasks;
    }

    try {
      const result = await this.doubaoService.parseRequirements(project.requirements);
      const cleanResult = this.extractJsonFromMarkdown(result);
      const parsed = JSON.parse(cleanResult);
      const tasks = parsed.tasks || getDefaultTasks(project.requirements);

      await ProjectModel.update(projectId, { parsed_tasks: JSON.stringify(tasks), status: 'parsed' });
      logger.info('需求解析完成', { projectId, taskCount: tasks.length });
      return tasks;
    } catch (error) {
      logger.error('需求解析失败', error);
      const tasks = getDefaultTasks(project.requirements);
      await ProjectModel.update(projectId, { parsed_tasks: JSON.stringify(tasks), status: 'parsed' });
      return tasks;
    }
  }

  async designArchitecture(projectId: string): Promise<DesignOutput> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }

    if (!config.doubao.apiKey) {
      logger.warn('未配置豆包API密钥，使用默认架构设计');
      const design = getDefaultDesign(project.requirements);
      await ProjectModel.update(projectId, { architecture: JSON.stringify(design), status: 'designed' });
      return design;
    }

    try {
      const result = await this.doubaoService.designArchitecture(project.requirements);
      const cleanResult = this.extractJsonFromMarkdown(result);
      const parsed = JSON.parse(cleanResult);

      const design: DesignOutput = {
        techStack: parsed.techStack || getDefaultDesign(project.requirements).techStack,
        database: parsed.database || getDefaultDesign(project.requirements).database,
        apis: parsed.apis || getDefaultDesign(project.requirements).apis,
        mermaidDiagram: parsed.mermaidDiagram || getDefaultDesign(project.requirements).mermaidDiagram
      };

      await ProjectModel.update(projectId, { architecture: JSON.stringify(design), status: 'designed' });
      logger.info('架构设计完成', { projectId });
      return design;
    } catch (error) {
      logger.error('架构设计失败', error);
      const design = getDefaultDesign(project.requirements);
      await ProjectModel.update(projectId, { architecture: JSON.stringify(design), status: 'designed' });
      return design;
    }
  }

  async getProject(projectId: string, userId: number): Promise<Project | null> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return null;
    }
    if (project.user_id !== userId) {
      throw new Error('无权访问此项目');
    }
    return project;
  }

  async getUserProjects(userId: number, limit = 20, offset = 0): Promise<Project[]> {
    return ProjectModel.findByUserId(userId, limit, offset);
  }

  async deleteProject(projectId: string, userId: number): Promise<void> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    if (project.user_id !== userId) {
      throw new Error('无权删除此项目');
    }
    await ProjectModel.delete(projectId);
    logger.info('项目删除成功', { projectId });
  }

  private generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractJsonFromMarkdown(text: string): string {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    return text.trim();
  }
}

export const createProjectService = () => new ProjectService();
