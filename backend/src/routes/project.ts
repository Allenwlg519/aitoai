import { Router } from 'express';
import { projectController } from '../controllers';
import { verifyToken } from '../utils';

const router = Router();

router.use(verifyToken);

router.post('/', (req, res, next) => {
  projectController.createProject(req, res, next);
});

router.get('/', (req, res, next) => {
  projectController.getUserProjects(req, res, next);
});

router.get('/:projectId', (req, res, next) => {
  projectController.getProject(req, res, next);
});

router.post('/:projectId/parse', (req, res, next) => {
  projectController.parseRequirements(req, res, next);
});

router.post('/:projectId/design', (req, res, next) => {
  projectController.designArchitecture(req, res, next);
});

router.post('/:projectId/generate', (req, res, next) => {
  projectController.generateCode(req, res, next);
});

router.delete('/:projectId', (req, res, next) => {
  projectController.deleteProject(req, res, next);
});

export default router;
