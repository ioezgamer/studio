import { config } from 'dotenv';
config();

import '@/ai/flows/classify-maintenance-task-relevance.ts';
import '@/ai/flows/generate-maintenance-tasks.ts';