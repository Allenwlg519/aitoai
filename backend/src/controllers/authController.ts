import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel, User } from '../database/userModel';
import { ApiError } from '../middleware';
import { generateTokenPair, verifyToken, JwtPayload } from '../utils';
import { logger } from '../utils';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        throw ApiError.badRequest('邮箱和密码是必填项');
      }

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        throw ApiError.conflict('该邮箱已被注册');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await UserModel.create({
        email,
        password_hash: passwordHash,
        name,
        role: 'user'
      });

      if (!user) {
        throw ApiError.internal('用户创建失败');
      }

      const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });

      logger.info('用户注册成功', { userId: user.id, email });

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          ...tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw ApiError.badRequest('邮箱和密码是必填项');
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw ApiError.unauthorized('邮箱或密码错误');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw ApiError.unauthorized('邮箱或密码错误');
      }

      const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });

      logger.info('用户登录成功', { userId: user.id, email });

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          ...tokens
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw ApiError.badRequest('刷新令牌是必填项');
      }

      const payload = verifyToken(refreshToken);
      const userId = typeof payload.userId === 'string' ? parseInt(payload.userId, 10) : payload.userId;
      const user = await UserModel.findById(userId);

      if (!user) {
        throw ApiError.unauthorized('用户不存在');
      }

      const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });

      logger.info('令牌刷新成功', { userId: user.id });

      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const user = await UserModel.findById(numericUserId);
      if (!user) {
        throw ApiError.notFound('用户不存在');
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          created_at: user.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw ApiError.unauthorized('未授权');
      }

      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const { name, password } = req.body;
      const updates: Partial<User> = {};

      if (name) updates.name = name;
      if (password) updates.password_hash = await bcrypt.hash(password, 12);

      const user = await UserModel.update(numericUserId, updates);

      if (!user) {
        throw ApiError.notFound('用户不存在');
      }

      logger.info('用户资料更新成功', { userId: numericUserId });

      res.json({
        success: true,
        message: '更新成功',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
