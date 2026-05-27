import { Router } from 'express';
import { authController } from '../controllers';
import { ApiError } from '../middleware';

const router = Router();

router.post('/register', (req, res, next) => {
  authController.register(req, res, next);
});

router.post('/login', (req, res, next) => {
  authController.login(req, res, next);
});

router.post('/refresh', (req, res, next) => {
  authController.refreshToken(req, res, next);
});

export default router;
