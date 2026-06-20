import { Response } from "express";
import { FolderService } from "../services/folderService";
import { AuthenticatedRequest } from "../types";

export class FolderController {
  constructor(private folderService: FolderService) {}

  create = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { name, parentId } = req.body;

    const folder = await this.folderService.create(userId, name, parentId);

    res.status(201).json({
      success: true,
      data: folder,
      message: "Folder created successfully",
    });
  };

  findAll = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const parentId = req.query.parentId as string | undefined;

    const folders = await this.folderService.findAll(userId, parentId);

    res.status(200).json({
      success: true,
      data: folders,
    });
  };

  findTree = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;

    const tree = await this.folderService.findTree(userId);

    res.status(200).json({
      success: true,
      data: tree,
    });
  };

  findBreadcrumb = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    const breadcrumb = await this.folderService.findBreadcrumb(userId, id);

    res.status(200).json({
      success: true,
      data: breadcrumb,
    });
  };

  update = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name } = req.body;

    const folder = await this.folderService.update(userId, id, name);

    res.status(200).json({
      success: true,
      data: folder,
      message: "Folder renamed successfully",
    });
  };

  delete = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;

    await this.folderService.delete(userId, id);

    res.status(200).json({
      success: true,
      message: "Folder deleted successfully",
    });
  };

  trash = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    await this.folderService.trash(userId, id);
    res.json({ success: true, message: "Folder moved to trash" });
  };

  restore = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    await this.folderService.restore(userId, id);
    res.json({ success: true, message: "Folder restored" });
  };

  permanentDelete = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    await this.folderService.permanentDelete(userId, id);
    res.json({ success: true, message: "Folder permanently deleted" });
  };

  listTrash = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const folders = await this.folderService.listTrash(userId);
    res.json({ success: true, data: folders });
  };

  move = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { folderId } = req.body;
    const folder = await this.folderService.move(userId, id, folderId || null);
    res.json({ success: true, data: folder });
  };

  copy = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { folderId } = req.body;
    const folder = await this.folderService.copy(userId, id, folderId || null);
    res.json({ success: true, data: folder });
  };
}
