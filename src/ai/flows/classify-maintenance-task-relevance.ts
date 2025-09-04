'use server';
/**
 * @fileOverview This file contains a Genkit flow for classifying the relevance of maintenance tasks based on the equipment or software involved.
 *
 * - classifyMaintenanceTaskRelevance - A function that takes maintenance task details and classifies their relevance.
 * - ClassifyMaintenanceTaskRelevanceInput - The input type for the classifyMaintenanceTaskRelevance function.
 * - ClassifyMaintenanceTaskRelevanceOutput - The return type for the classifyMaintenanceTaskRelevance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClassifyMaintenanceTaskRelevanceInputSchema = z.object({
  equipmentType: z.string().describe('The type of equipment being maintained.'),
  softwareVersion: z.string().optional().describe('The version of the software installed on the equipment, if applicable.'),
  taskDescription: z.string().describe('A description of the maintenance task performed.'),
});
export type ClassifyMaintenanceTaskRelevanceInput = z.infer<typeof ClassifyMaintenanceTaskRelevanceInputSchema>;

const ClassifyMaintenanceTaskRelevanceOutputSchema = z.object({
  isRelevant: z.boolean().describe('Whether the maintenance task is relevant to the equipment or software.'),
  relevanceExplanation: z.string().describe('An explanation of why the task is relevant or not.'),
});
export type ClassifyMaintenanceTaskRelevanceOutput = z.infer<typeof ClassifyMaintenanceTaskRelevanceOutputSchema>;

export async function classifyMaintenanceTaskRelevance(input: ClassifyMaintenanceTaskRelevanceInput): Promise<ClassifyMaintenanceTaskRelevanceOutput> {
  return classifyMaintenanceTaskRelevanceFlow(input);
}

const classifyMaintenanceTaskRelevancePrompt = ai.definePrompt({
  name: 'classifyMaintenanceTaskRelevancePrompt',
  input: {schema: ClassifyMaintenanceTaskRelevanceInputSchema},
  output: {schema: ClassifyMaintenanceTaskRelevanceOutputSchema},
  prompt: `You are an AI assistant that classifies the relevance of maintenance tasks based on the equipment type, software version (if applicable), and task description.

  Determine if the task is relevant to the equipment or software and provide a brief explanation.

  Equipment Type: {{{equipmentType}}}
  Software Version: {{{softwareVersion}}}
  Task Description: {{{taskDescription}}}

  Is the task relevant? (true/false):
  Explanation:`,
});

const classifyMaintenanceTaskRelevanceFlow = ai.defineFlow(
  {
    name: 'classifyMaintenanceTaskRelevanceFlow',
    inputSchema: ClassifyMaintenanceTaskRelevanceInputSchema,
    outputSchema: ClassifyMaintenanceTaskRelevanceOutputSchema,
  },
  async input => {
    const {output} = await classifyMaintenanceTaskRelevancePrompt(input);
    return output!;
  }
);
