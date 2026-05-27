import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const corsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.header('Access-Control-Allow-Origin', config.cors.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', String(config.cors.credentials));

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};
