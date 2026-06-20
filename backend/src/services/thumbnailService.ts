import sharp from "sharp";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { storageService } from "./storageService";
import { prisma } from "../db";

const execFileAsync = promisify(execFile);
ffmpeg.setFfmpegPath(ffmpegPath.path);

const THUMBNAIL_SIZES = {
  small: 128,
  medium: 256,
  large: 512,
} as const;

type ThumbnailSize = keyof typeof THUMBNAIL_SIZES;

class ThumbnailService {
  async generateThumbnail(
    userId: string,
    fileId: string,
    filePath: string,
    mimeType: string,
    size: ThumbnailSize = "medium"
  ): Promise<string | null> {
    try {
      console.log(`[Thumbnail] Generating ${size} thumbnail for ${fileId}, path: ${filePath}, mimeType: ${mimeType}`);
      await storageService.ensureUserDirectories(userId);
      const thumbnailDir = storageService.getUserThumbnailsPath(userId);
      const dim = THUMBNAIL_SIZES[size];
      const thumbnailPath = path.join(thumbnailDir, `${fileId}-${size}.jpg`);
      console.log(`[Thumbnail] Target thumbnail path: ${thumbnailPath}`);

      if (mimeType.startsWith("image/")) {
        await sharp(filePath)
          .resize(dim, dim, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
        return thumbnailPath;
      }

      if (mimeType.startsWith("video/")) {
        return await this.generateVideoThumbnail(filePath, thumbnailPath, dim);
      }

      if (mimeType === "application/pdf") {
        return await this.generatePdfThumbnail(filePath, thumbnailPath, dim);
      }

      return null;
    } catch (error) {
      console.error(`Thumbnail generation failed for ${fileId}:`, error);
      return null;
    }
  }

  private async generateVideoThumbnail(
    filePath: string,
    thumbnailPath: string,
    dim: number
  ): Promise<string | null> {
    return new Promise((resolve) => {
      ffmpeg(filePath)
        .screenshots({
          timestamps: [1],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: `${dim}x${dim}`,
        })
        .on("end", () => resolve(thumbnailPath))
        .on("error", (err) => {
          console.error("Video thumbnail error:", err.message);
          resolve(null);
        });
    });
  }

  private async generatePdfThumbnail(
    filePath: string,
    thumbnailPath: string,
    dim: number
  ): Promise<string | null> {
    try {
      const tempDir = path.dirname(thumbnailPath);
      const tempPrefix = path.join(tempDir, `pdf-${Date.now()}`);
      await execFileAsync("pdftoppm", [
        "-jpeg",
        "-f", "1",
        "-l", "1",
        "-r", "72",
        "-scale-to", String(dim),
        filePath,
        tempPrefix,
      ]);

      // pdftoppm creates files like prefix-01.jpg
      const generatedFiles = fs.readdirSync(tempDir)
        .filter((f) => f.startsWith(path.basename(tempPrefix)))
        .map((f) => path.join(tempDir, f));

      if (generatedFiles.length > 0) {
        fs.renameSync(generatedFiles[0], thumbnailPath);
        return thumbnailPath;
      }
      return null;
    } catch (err) {
      console.error("PDF thumbnail error:", err);
      return null;
    }
  }

  async generateAllSizes(
    userId: string,
    fileId: string,
    filePath: string,
    mimeType: string
  ): Promise<{ small: string | null; medium: string | null; large: string | null }> {
    const results: Record<string, string | null> = {};
    for (const size of Object.keys(THUMBNAIL_SIZES) as ThumbnailSize[]) {
      results[size] = await this.generateThumbnail(userId, fileId, filePath, mimeType, size);
    }
    return results as { small: string | null; medium: string | null; large: string | null };
  }

  async processUploadedFile(fileId: string): Promise<void> {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      console.log(`[Thumbnail] File ${fileId} not found in DB`);
      return;
    }
    console.log(`[Thumbnail] Processing file: ${file.originalName}, path: ${file.path}, mimeType: ${file.mimeType}`);

    const thumbnails = await this.generateAllSizes(
      file.userId,
      fileId,
      file.path,
      file.mimeType
    );

    console.log(`[Thumbnail] Generated thumbnails:`, thumbnails);

    await prisma.file.update({
      where: { id: fileId },
      data: {
        thumbnail: thumbnails.medium,
        thumbnailSmall: thumbnails.small,
        thumbnailMedium: thumbnails.medium,
        thumbnailLarge: thumbnails.large,
      },
    });
    console.log(`[Thumbnail] Updated DB for file ${fileId}`);
  }
}

export const thumbnailService = new ThumbnailService();