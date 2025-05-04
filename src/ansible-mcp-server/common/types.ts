import { z } from 'zod';

// Schema for running a playbook
export const RunPlaybookSchema = z.object({
  playbook: z.string().min(1, 'Playbook path is required'),
  extraVars: z.record(z.any()).optional(),
  inventory: z.string().optional(),
  tags: z.string().optional(),
  limit: z.string().optional(),
});

export type RunPlaybookOptions = z.infer<typeof RunPlaybookSchema>;

// Schema for listing inventory
export const ListInventorySchema = z.object({
  inventory: z.string().optional(),
});

export type ListInventoryOptions = z.infer<typeof ListInventorySchema>;

// Schema for checking playbook syntax
export const CheckSyntaxSchema = z.object({
  playbook: z.string().min(1, 'Playbook path is required'),
});

export type CheckSyntaxOptions = z.infer<typeof CheckSyntaxSchema>;

// Schema for listing tasks in a playbook
export const ListTasksSchema = z.object({
  playbook: z.string().min(1, 'Playbook path is required'),
});

export type ListTasksOptions = z.infer<typeof ListTasksSchema>;
