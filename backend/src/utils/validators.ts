import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const createFolderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(255, "Folder name must be at most 255 characters")
    .regex(/^[^\\/:*?"<>|]+$/, "Folder name contains invalid characters"),
  parentId: z.string().uuid("Invalid parent folder ID").nullable().optional(),
});

export const updateFolderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(255, "Folder name must be at most 255 characters")
    .regex(/^[^\\/:*?"<>|]+$/, "Folder name contains invalid characters"),
});

export const updateFileSchema = z.object({
  originalName: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name must be at most 255 characters"),
});

export const fileQuerySchema = z.object({
  folderId: z.string().uuid("Invalid folder ID").optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  minSize: z.coerce.number().optional(),
  maxSize: z.coerce.number().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type UpdateFileInput = z.infer<typeof updateFileSchema>;
