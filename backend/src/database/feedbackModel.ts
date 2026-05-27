import { query, execute } from './connection';
import { FeedbackData } from './connection';

export interface Feedback {
  id: number;
  user_id?: number;
  project_id?: string;
  content: string;
  rating?: number;
  created_at: string;
}

export interface CreateFeedbackInput {
  user_id?: number;
  project_id?: string;
  content: string;
  rating?: number;
}

export class FeedbackModel {
  static async findById(id: number): Promise<Feedback | null> {
    const rows = await query<FeedbackData>('feedback', (item) => item.id === id);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findByProjectId(project_id: string): Promise<Feedback[]> {
    const rows = await query<FeedbackData>('feedback', (item) => item.project_id === project_id);
    return rows;
  }

  static async create(data: CreateFeedbackInput): Promise<Feedback | null> {
    const now = new Date().toISOString();
    const feedbackData: FeedbackData = {
      id: 0,
      user_id: data.user_id,
      project_id: data.project_id,
      content: data.content,
      rating: data.rating,
      created_at: now
    };

    const result = await execute('feedback', 'insert', feedbackData);
    return this.findById(result.lastID);
  }
}
