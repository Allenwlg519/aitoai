export { initDatabase, query, execute, closeDatabase } from './connection';
export { UserModel, type User } from './userModel';
export { ProjectModel, type Project } from './projectModel';
export { FeedbackModel, type Feedback } from './feedbackModel';

export { createProject, updateProject, getProject, getAllProjects, createFeedback, initDB } from '../database';
