import { PrismaClient, File } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { storageService } from "./storageService";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/errors";
import { FolderTree } from "../types";
import { FolderRepository } from "../repositories/FolderRepository";
import { FileRepository } from "../repositories/FileRepository";
import { storageBlobService } from "./storageBlobService";
import { storageAccountingService } from "./storageAccountingService";

export class FolderService {
  private folderRepository: FolderRepository;
  private fileRepository: FileRepository;

  constructor(private prisma: PrismaClient) {
    this.folderRepository = new FolderRepository(prisma);
    this.fileRepository = new FileRepository(prisma);
  }

  async create(
    userId: string,
    name: string,
    parentId?: string | null
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }> {
    if (parentId) {
      const parent = await this.folderRepository.findById(parentId);

      if (!parent) {
        throw new NotFoundError("Parent folder not found");
      }

      if (parent.userId !== userId) {
        throw new ForbiddenError("Access denied to parent folder");
      }
    }

    const existing = await this.folderRepository.findFirst({
      userId,
      parentId: parentId || null,
      name,
    });

    if (existing) {
      throw new ConflictError("A folder with this name already exists here");
    }

    const folder = await this.folderRepository.create({
      userId,
      parentId: parentId || null,
      name,
    });

    await storageService.ensureUserDirectories(userId);

    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      createdAt: folder.createdAt,
    };
  }

  async findAll(
    userId: string,
    parentId?: string
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }[]> {
    const where: any = { userId, deletedAt: null };

    if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = null;
    }

    const folders = await this.folderRepository.findMany(where);

    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      createdAt: f.createdAt,
    }));
  }

  async findTree(userId: string): Promise<FolderTree[]> {
    const folders = await this.folderRepository.findMany({ userId, deletedAt: null });

    const folderMap = new Map<string, FolderTree>();
    const roots: FolderTree[] = [];

    for (const folder of folders) {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
        children: [],
      });
    }

    for (const folder of folders) {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findBreadcrumb(
    userId: string,
    folderId: string
  ): Promise<{ id: string; name: string }[]> {
    const folder = await this.folderRepository.findById(folderId);

    if (!folder || folder.userId !== userId) {
      throw new NotFoundError("Folder not found");
    }

    const breadcrumb: { id: string; name: string }[] = [];
    let current: string | null = folderId;

    while (current) {
      const currentId: string = current;
      const f = await this.folderRepository.findById(currentId);
      if (!f) break;
      breadcrumb.unshift({ id: f.id, name: f.name });
      current = f.parentId;
    }

    return breadcrumb;
  }

  async update(
    userId: string,
    id: string,
    name: string
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }> {
    const folder = await this.folderRepository.findById(id);

    if (!folder) {
      throw new NotFoundError("Folder not found");
    }

    if (folder.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    const duplicate = await this.folderRepository.findFirst({
      userId,
      parentId: folder.parentId,
      name,
      NOT: { id },
    });

    if (duplicate) {
      throw new ConflictError("A folder with this name already exists here");
    }

    const updated = await this.folderRepository.update(id, { name });

    return {
      id: updated.id,
      name: updated.name,
      parentId: updated.parentId,
      createdAt: updated.createdAt,
    };
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.permanentDelete(userId, id);
  }

  // === Trash operations (soft delete) ===

  async trash(userId: string, folderId: string): Promise<void> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");
    if (folder.deletedAt) return;

    const folderIds = await this.getFolderIdsRecursive(userId, folderId);
    const deletedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.file.updateMany({
        where: { userId, folderId: { in: folderIds }, deletedAt: null },
        data: { deletedAt },
      });
      await tx.folder.updateMany({
        where: { userId, id: { in: folderIds }, deletedAt: null },
        data: { deletedAt },
      });
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });
  }

  async restore(userId: string, folderId: string): Promise<void> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");
    if (!folder.deletedAt) return; // Not trashed

    const folderIds = await this.getFolderIdsRecursive(userId, folderId);
    await this.prisma.$transaction(async (tx) => {
      await tx.folder.updateMany({
        where: { userId, id: { in: folderIds }, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
      await tx.file.updateMany({
        where: { userId, folderId: { in: folderIds }, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });
  }

  async permanentDelete(userId: string, folderId: string): Promise<void> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");

    const folderIds = await this.getFolderIdsRecursive(userId, folderId);
    const files = await this.prisma.file.findMany({
      where: { userId, folderId: { in: folderIds } },
    });

    const fileIds = files.map((file) => file.id);
    const versions = fileIds.length
      ? await this.prisma.fileVersion.findMany({
          where: { fileId: { in: fileIds } },
        })
      : [];
    const cleanupPaths: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const file of files) {
        await tx.file.delete({ where: { id: file.id } });
        const cleanupPath = await storageBlobService.releaseReference(file.blobId, tx);
        if (cleanupPath) cleanupPaths.push(cleanupPath);
      }

      for (const version of versions) {
        const cleanupPath = await storageBlobService.releaseReference(version.blobId, tx);
        if (cleanupPath) cleanupPaths.push(cleanupPath);
      }

      await tx.folder.deleteMany({ where: { userId, id: { in: folderIds } } });
      await storageAccountingService.recalculateUserUsage(userId, tx);
    });

    for (const cleanupPath of cleanupPaths) {
      await storageBlobService.deletePhysicalBlob(cleanupPath);
    }
    for (const file of files) {
      if (!file.blobId && storageService.isSafePathGlobal(file.path)) {
        try {
          const fs = require("fs");
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {}
      }
    }
  }

  async listTrash(userId: string): Promise<{ id: string; name: string; parentId: string | null; deletedAt: Date }[]> {
    const folders = await this.folderRepository.findMany({
      userId,
      deletedAt: { not: null } as any,
    });

    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      deletedAt: f.deletedAt!,
    }));
  }

  private async getFolderIdsRecursive(userId: string, rootFolderId: string): Promise<string[]> {
    const result: string[] = [];
    const stack = [rootFolderId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      const folder = await this.prisma.folder.findFirst({
        where: { id: currentId, userId },
        select: { id: true },
      });
      if (!folder) continue;
      result.push(folder.id);

      const children = await this.prisma.folder.findMany({
        where: { userId, parentId: currentId },
        select: { id: true },
      });
      stack.push(...children.map((child) => child.id));
    }

    return result;
  }

  private async isDescendant(
    potentialDescendantId: string,
    potentialAncestorId: string | null,
    userId: string
  ): Promise<boolean> {
    if (!potentialAncestorId) return false;
    if (potentialDescendantId === potentialAncestorId) return true;

    const folder = await this.folderRepository.findById(potentialDescendantId);

    if (!folder || folder.userId !== userId) return false;
    if (!folder.parentId) return false;

    return this.isDescendant(folder.parentId, potentialAncestorId, userId);
  }

  async move(
    userId: string,
    folderId: string,
    targetParentId: string | null
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");

    if (targetParentId) {
      const targetParent = await this.folderRepository.findById(targetParentId);
      if (!targetParent) throw new NotFoundError("Target folder not found");
      if (targetParent.userId !== userId) throw new ForbiddenError("Access denied");

      if (await this.isDescendant(targetParentId, folderId, userId)) {
        throw new ForbiddenError("Cannot move folder into itself or its descendant");
      }
    }

    const existing = await this.folderRepository.findFirst({
      userId,
      parentId: targetParentId,
      name: folder.name,
      NOT: { id: folderId },
    });

    if (existing) {
      const ext = "";
      const nameWithoutExt = folder.name;
      let newName = `${nameWithoutExt} (copy)${ext}`;
      let counter = 1;
      while (await this.folderRepository.findFirst({
        userId,
        parentId: targetParentId,
        name: newName,
      })) {
        counter++;
        newName = `${nameWithoutExt} (copy ${counter})${ext}`;
      }
      const updated = await this.folderRepository.update(folderId, { parentId: targetParentId, name: newName });
      return {
        id: updated.id,
        name: updated.name,
        parentId: updated.parentId,
        createdAt: updated.createdAt,
      };
    }

    const updated = await this.folderRepository.update(folderId, { parentId: targetParentId });

    return {
      id: updated.id,
      name: updated.name,
      parentId: updated.parentId,
      createdAt: updated.createdAt,
    };
  }

  async copy(
    userId: string,
    folderId: string,
    targetParentId: string | null
  ): Promise<{ id: string; name: string; parentId: string | null; createdAt: Date }> {
    const folder = await this.folderRepository.findById(folderId);
    if (!folder) throw new NotFoundError("Folder not found");
    if (folder.userId !== userId) throw new ForbiddenError("Access denied");

    let copyName = folder.name;
    let counter = 1;
    while (await this.folderRepository.findFirst({
      userId,
      parentId: targetParentId,
      name: copyName,
    })) {
      copyName = `${folder.name} (copy ${counter})`;
      counter++;
    }

    const copiedFolder = await this.folderRepository.create({
      userId,
      parentId: targetParentId,
      name: copyName,
    });

    const { files: childFiles } = await this.fileRepository.findAll({
      userId,
      folderId,
      deletedAt: null,
    });

    for (const file of childFiles) {
      await this.copyFileRecord(userId, file, copiedFolder.id);
    }

    const childFolders = await this.folderRepository.findMany({
      parentId: folderId,
      deletedAt: null,
    });

    for (const child of childFolders) {
      await this.copyFolderRecursive(userId, child.id, copiedFolder.id);
    }

    return {
      id: copiedFolder.id,
      name: copiedFolder.name,
      parentId: copiedFolder.parentId,
      createdAt: copiedFolder.createdAt,
    };
  }

  private async copyFolderRecursive(
    userId: string,
    sourceFolderId: string,
    targetParentId: string
  ): Promise<void> {
    const sourceFolder = await this.folderRepository.findById(sourceFolderId);
    if (!sourceFolder) return;

    const newFolder = await this.folderRepository.create({
      userId,
      parentId: targetParentId,
      name: sourceFolder.name,
    });

    const { files } = await this.fileRepository.findAll({
      userId,
      folderId: sourceFolderId,
      deletedAt: null,
    });

    for (const file of files) {
      await this.copyFileRecord(userId, file, newFolder.id);
    }

    const children = await this.folderRepository.findMany({
      parentId: sourceFolderId,
      deletedAt: null,
    });

    for (const child of children) {
      await this.copyFolderRecursive(userId, child.id, newFolder.id);
    }
  }

  private async copyFileRecord(userId: string, file: File, targetFolderId: string): Promise<void> {
    const blob = file.blobId ? await storageBlobService.addReference(file.blobId) : null;
    await this.fileRepository.create({
      userId,
      folderId: targetFolderId,
      blobId: file.blobId,
      originalName: file.originalName,
      storedName: `${uuidv4()}${file.extension || ""}`,
      path: blob?.physicalPath || file.path,
      mimeType: file.mimeType,
      extension: file.extension,
      category: file.category,
      size: file.size,
      hash: file.hash,
      refCount: blob?.referenceCount || file.refCount,
    });
    await storageAccountingService.recalculateUserUsage(userId);
  }
}
