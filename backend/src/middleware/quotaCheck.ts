import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";

// Quotas removed - users can use unlimited storage
export function quotaCheck(_additionalSize?: number) {
  return async (_req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    next();
  };
}
