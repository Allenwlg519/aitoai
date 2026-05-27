import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

export const bodyParser = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET') {
    next();
    return;
  }

  const contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes('application/json')) {
    next();
    return;
  }

  next();
};

export const validateRequest = (schema: {
  body?: any;
  query?: any;
  params?: any;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (schema.body && req.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        next(ApiError.badRequest(error.details[0].message));
        return;
      }
    }

    if (schema.query && req.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        next(ApiError.badRequest(error.details[0].message));
        return;
      }
    }

    if (schema.params && req.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        next(ApiError.badRequest(error.details[0].message));
        return;
      }
    }

    next();
  };
};
