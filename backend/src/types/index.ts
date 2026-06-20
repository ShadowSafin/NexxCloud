import { Request } from "express";
import { User } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface FileMetadata {
  id: string;
  originalName: string;
  storedName: string;
  path: string;
  mimeType: string;
  category: string;
  thumbnail: string | null;
  thumbnailSmall: string | null;
  thumbnailMedium: string | null;
  thumbnailLarge: string | null;
  isFavorite: boolean;
  size: number;
  createdAt: Date;
  userId: string;
  folderId: string | null;
}

export interface FolderTree {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  children: FolderTree[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
