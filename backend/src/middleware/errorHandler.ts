import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (config.env === 'development') {
    console.error('❌ Error:', {
      message: err.message,
      stack: err.stack,
      statusCode
    });
  } else {
    console.error('❌ Error:', {
      message: err.message,
      statusCode
    });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: config.env === 'development' ? err : undefined,
    ...(isOperational && { stack: err.stack })
  });
};

export class ApiError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }

  static unauthorized(message = '未授权') {
    return new ApiError(401, message);
  }

  static forbidden(message = '禁止访问') {
    return new ApiError(403, message);
  }

  static notFound(message = '资源不存在') {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  static internal(message = '服务器内部错误') {
    return new ApiError(500, message, false);
  }
}
