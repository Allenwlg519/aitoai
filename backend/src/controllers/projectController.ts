import { Response, NextFunction } from 'express';
import { ProjectService, createProjectService, CodeGeneratorService, createCodeGeneratorService } from '../services';
import { ProjectModel, Project } from '../database/projectModel';
import { AuthRequest } from './authController';
import { ApiError } from '../middleware';
import { logger } from '../utils';

export class ProjectController {
  private projectService = createProjectService();
  private codeGeneratorService = createCodeGeneratorService();

  async createProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const { requirements, name } = req.body;

      if (!requirements) {
        throw ApiError.badRequest('项目需求是必填项');
      }

      const project = await this.projectService.createProject(numericUserId, requirements, name);

      if (!project) {
        throw ApiError.internal('项目创建失败');
      }

      logger.info('项目创建成功', { projectId: project.id, userId: numericUserId });

      res.status(201).json({
        success: true,
        message: '项目创建成功',
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  async parseRequirements(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const { projectId } = req.params;

      const project = await this.projectService.getProject(projectId, numericUserId);
      if (!project) {
        throw ApiError.notFound('项目不存在');
      }

      const tasks = await this.projectService.parseRequirements(projectId);

      logger.info('需求解析成功', { projectId });

      res.json({
        success: true,
        message: '需求解析成功',
        data: { tasks }
      });
    } catch (error) {
      next(error);
    }
  }

  async designArchitecture(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const { projectId } = req.params;

      const project = await this.projectService.getProject(projectId, numericUserId);
      if (!project) {
        throw ApiError.notFound('项目不存在');
      }

      const design = await this.projectService.designArchitecture(projectId);

      logger.info('架构设计成功', { projectId });

      res.json({
        success: true,
        message: '架构设计成功',
        data: design
      });
    } catch (error) {
      next(error);
    }
  }

  async generateCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const { projectId } = req.params;

      const project = await this.projectService.getProject(projectId, numericUserId);
      if (!project) {
        throw ApiError.notFound('项目不存在');
      }

      const generated = await this.codeGeneratorService.generateCode(projectId);

      logger.info('代码生成成功', { projectId, fileCount: generated.files.length });

      res.json({
        success: true,
        message: '代码生成成功',
        data: {
          files: generated.files,
          fileCount: generated.files.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const { projectId } = req.params;

      const project = await this.projectService.getProject(projectId, numericUserId);
      if (!project) {
        throw ApiError.notFound('项目不存在');
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserProjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const projects = await this.projectService.getUserProjects(numericUserId, limit, offset);

      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const { projectId } = req.params;

      await this.projectService.deleteProject(projectId, numericUserId);

      logger.info('项目删除成功', { projectId });

      res.json({
        success: true,
        message: '项目删除成功'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
