import { z } from 'zod';

// Schema for running ad-hoc commands
export const RunAdHocSchema = z.object({
  pattern: z.string().min(1, 'Host pattern is required'),
  module: z.string().default('shell'),
  args: z.string().optional(),
  inventory: z.string().optional(),
  become: z.boolean().optional(),
  extra_vars: z.record(z.any()).optional(),
});

export type RunAdHocOptions = z.infer<typeof RunAdHocSchema>;

// Schema for vault encryption/decryption
export const VaultEncryptStringSchema = z.object({
  string: z.string().min(1, 'String to encrypt is required'),
  vault_id: z.string().optional(),
  vault_password_file: z.string().optional(),
  name: z.string().optional(),
});

export type VaultEncryptStringOptions = z.infer<typeof VaultEncryptStringSchema>;

export const VaultDecryptStringSchema = z.object({
  string: z.string().min(1, 'Encrypted string is required'),
  vault_id: z.string().optional(),
  vault_password_file: z.string().optional(),
});

export type VaultDecryptStringOptions = z.infer<typeof VaultDecryptStringSchema>;

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
