import { Router } from 'express';
import authRoutes from './auth';
import projectRoutes from './project';
import { parseRouter } from './parse';
import { designRouter } from './design';
import { generateRouter } from './generate';
import { deployRouter } from './deploy';
import { chatRouter } from './chat';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/parse', parseRouter);
router.use('/design', designRouter);
router.use('/generate', generateRouter);
router.use('/deploy', deployRouter);
router.use('/chat', chatRouter);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务正常运行',
    timestamp: new Date().toISOString()
  });
});

export default router;
