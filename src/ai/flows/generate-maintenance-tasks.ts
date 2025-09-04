'use server';

/**
 * @fileOverview A flow to generate maintenance tasks based on the selected equipment type.
 *
 * - generateMaintenanceTasks - A function that generates maintenance tasks.
 * - GenerateMaintenanceTasksInput - The input type for the generateMaintenanceTasks function.
 * - GenerateMaintenanceTasksOutput - The return type for the generateMaintenanceTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMaintenanceTasksInputSchema = z.object({
  equipmentType: z
    .string()
    .describe('El tipo de equipo para el cual se generarán tareas de mantenimiento.'),
});
export type GenerateMaintenanceTasksInput = z.infer<typeof GenerateMaintenanceTasksInputSchema>;

const GenerateMaintenanceTasksOutputSchema = z.object({
  tasks: z
    .array(z.string())
    .describe('Una lista de tareas de mantenimiento para el tipo de equipo seleccionado.'),
});
export type GenerateMaintenanceTasksOutput = z.infer<typeof GenerateMaintenanceTasksOutputSchema>;

export async function generateMaintenanceTasks(
  input: GenerateMaintenanceTasksInput
): Promise<GenerateMaintenanceTasksOutput> {
  return generateMaintenanceTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMaintenanceTasksPrompt',
  input: {schema: GenerateMaintenanceTasksInputSchema},
  output: {schema: GenerateMaintenanceTasksOutputSchema},
  prompt: `Eres un técnico de mantenimiento experto. Según el tipo de equipo proporcionado, genera una lista de tareas de mantenimiento comunes. Todas las respuestas serán en español Latinoamericano.

Equipment Type: {{{equipmentType}}}

Tasks:`,
});

const generateMaintenanceTasksFlow = ai.defineFlow(
  {
    name: 'generateMaintenanceTasksFlow',
    inputSchema: GenerateMaintenanceTasksInputSchema,
    outputSchema: GenerateMaintenanceTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
