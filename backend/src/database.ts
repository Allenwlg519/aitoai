import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(__dirname, '..', 'storage');
const PROJECTS_FILE = path.join(STORAGE_DIR, 'projects.json');
const FEEDBACK_FILE = path.join(STORAGE_DIR, 'feedback.json');

export interface Project {
  id: string;
  name: string;
  requirements: string;
  status: 'pending' | 'parsing' | 'designing' | 'generating' | 'deploying' | 'completed' | 'failed';
  progress: number;
  designOutput: string;
  generatedCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  projectId: string;
  rating: number;
  comments: string;
  createdAt: string;
}

export const initDB = (): void => {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify([]));
  }
  
  if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([]));
  }
};

const readProjects = (): Project[] => {
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeProjects = (projects: Project[]): void => {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
};

const readFeedback = (): Feedback[] => {
  try {
    const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeFeedback = (feedback: Feedback[]): void => {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));
};

export const createProject = (project: Omit<Project, 'createdAt' | 'updatedAt'>): void => {
  const projects = readProjects();
  const now = new Date().toISOString();
  projects.unshift({
    ...project,
    createdAt: now,
    updatedAt: now
  });
  writeProjects(projects);
};

export const updateProject = (id: string, updates: Partial<Project>): void => {
  const projects = readProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) {
    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeProjects(projects);
  }
};

export const getProject = (id: string): Project | undefined => {
  const projects = readProjects();
  return projects.find(p => p.id === id);
};

export const getAllProjects = (): Project[] => {
  return readProjects();
};

export const createFeedback = (projectId: string, rating: number, comments: string): void => {
  const feedback = readFeedback();
  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  feedback.unshift({ id, projectId, rating, comments, createdAt: now });
  writeFeedback(feedback);
};