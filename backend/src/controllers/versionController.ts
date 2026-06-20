import { Response } from "express";
import { VersionService } from "../services/versionService";
import { AuthenticatedRequest } from "../types";

export class VersionController {
  constructor(private versionService: VersionService) {}

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { fileId } = req.params;
    const version = await this.versionService.createVersion(userId, fileId);
    res.status(201).json({ success: true, data: version });
  };

  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { fileId } = req.params;
    const versions = await this.versionService.listVersions(userId, fileId);
    res.json({ success: true, data: versions });
  };

  restore = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { fileId, versionNumber } = req.params;
    const result = await this.versionService.restoreVersion(userId, fileId, parseInt(versionNumber));
    res.json({ success: true, data: result });
  };

  delete = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { fileId, versionNumber } = req.params;
    await this.versionService.deleteVersion(userId, fileId, parseInt(versionNumber));
    res.json({ success: true, message: "Version deleted" });
  };
}
