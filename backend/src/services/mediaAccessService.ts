import jwt from "jsonwebtoken";
import { config } from "../config";

export type MediaAccessType = "stream" | "download" | "thumbnail";

export interface MediaAccessPayload {
  fileId: string;
  userId: string;
  type: MediaAccessType;
  size?: "small" | "medium" | "large";
}

export class MediaAccessService {
  createToken(payload: MediaAccessPayload, expiresIn = "5m"): string {
    return jwt.sign(payload, config.mediaTokenSecret, {
      expiresIn: expiresIn as any,
      audience: "nexxcloud-media",
      issuer: "nexxcloud-api",
    });
  }

  verifyToken(token: string): MediaAccessPayload {
    return jwt.verify(token, config.mediaTokenSecret, {
      audience: "nexxcloud-media",
      issuer: "nexxcloud-api",
    }) as MediaAccessPayload;
  }
}

export const mediaAccessService = new MediaAccessService();
