import express, { Request, Response } from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { updateProject, createFeedback } from '../database';
import { broadcastProgress } from '../server';

export const deployRouter = express.Router();

interface DeployRequest {
  taskId: string;
  requirements: string;
}

interface DeployResponse {
  taskId: string;
  frontendUrl: string;
  backendUrl: string;
}

interface FeedbackRequest {
  taskId: string;
  rating: number;
  comments: string;
}

const runningProcesses = new Map<string, { backend: ChildProcess | null; frontend: ChildProcess | null; frontendPort: number; backendPort: number }>();

let nextPort = 4000;

const getNextPort = (): number => {
  return nextPort++;
};

deployRouter.post('/', async (req: Request, res: Response) => {
  const { taskId, requirements } = req.body as DeployRequest;

  if (!taskId || !requirements) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  broadcastProgress(taskId, 4, 4, '正在部署应用...');

  const outputDir = path.join(__dirname, '..', '..', 'generated', taskId);
  const backendDir = path.join(outputDir, 'backend');
  const frontendDir = path.join(outputDir, 'frontend');

  const backendPort = getNextPort();
  const frontendPort = getNextPort();

  await updateProject(taskId, { status: 'deploying', progress: 85 });
  broadcastProgress(taskId, 4, 4, '正在安装后端依赖...');

  const installBackend = new Promise<void>((resolve) => {
    const isWindows = process.platform === 'win32';
    const npmInstall = spawn(isWindows ? 'cmd.exe' : 'npm', isWindows ? ['/c', 'npm', 'install', '--legacy-peer-deps'] : ['install', '--legacy-peer-deps'], { cwd: backendDir });
    npmInstall.on('close', () => resolve());
  });
  await installBackend;

  broadcastProgress(taskId, 4, 4, '正在启动后端服务...');

  const backendProcess = spawn('node', ['server.js'], { cwd: backendDir, env: { ...process.env, PORT: backendPort.toString() } });
  runningProcesses.set(taskId, { backend: backendProcess, frontend: null, frontendPort, backendPort });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend error: ${data}`);
  });

  await new Promise(resolve => setTimeout(resolve, 5000));

  broadcastProgress(taskId, 4, 4, '正在安装前端依赖...');

  const installFrontend = new Promise<void>((resolve) => {
    const isWindows = process.platform === 'win32';
    const npmInstall = spawn(isWindows ? 'cmd.exe' : 'npm', isWindows ? ['/c', 'npm', 'install'] : ['install'], { cwd: frontendDir });
    npmInstall.on('close', () => resolve());
  });
  await installFrontend;

  broadcastProgress(taskId, 4, 4, '正在启动前端服务...');

  const isWindows = process.platform === 'win32';
  const frontendProcess = spawn(isWindows ? 'cmd.exe' : 'npm', isWindows ? ['/c', 'npm', 'start'] : ['start'], { cwd: frontendDir, env: { ...process.env, PORT: frontendPort.toString(), REACT_APP_API_URL: `http://localhost:${backendPort}/api` } });
  
  const currentProcesses = runningProcesses.get(taskId) || { backend: null, frontend: null, frontendPort: 0, backendPort: 0 };
  runningProcesses.set(taskId, { ...currentProcesses, frontend: frontendProcess });

  frontendProcess.stdout.on('data', (data) => {
    console.log(`Frontend: ${data}`);
  });

  frontendProcess.stderr.on('data', (data) => {
    console.error(`Frontend error: ${data}`);
  });

  await new Promise(resolve => setTimeout(resolve, 5000));

  await updateProject(taskId, { status: 'completed', progress: 100 });
  
  const frontendUrl = `http://localhost:${frontendPort}`;
  const backendUrl = `http://localhost:${backendPort}`;
  
  broadcastProgress(taskId, 4, 4, '部署完成', { 
    frontendUrl, 
    backendUrl 
  });

  res.json({ 
    taskId, 
    frontendUrl, 
    backendUrl 
  });
});

deployRouter.post('/stop/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const processes = runningProcesses.get(taskId);

  if (processes) {
    if (processes.backend) {
      processes.backend.kill();
    }
    if (processes.frontend) {
      processes.frontend.kill();
    }
    runningProcesses.delete(taskId);
  }

  res.json({ success: true });
});

deployRouter.post('/feedback', async (req: Request, res: Response) => {
  const { taskId, rating, comments } = req.body as FeedbackRequest;

  if (!taskId || !rating) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  await createFeedback(taskId, rating, comments || '');
  res.json({ success: true });
});