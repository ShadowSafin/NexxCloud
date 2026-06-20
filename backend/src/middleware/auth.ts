import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { AuthenticatedRequest, TokenPayload } from "../types";
import { prisma } from "../db";

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Accept access tokens only from Authorization headers.
    // Media tags use short-lived signed URLs instead of leaking JWTs in query strings.
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      throw new UnauthorizedError("Access token required");
    }

    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid or expired token"));
    } else {
      next(error);
    }
  }
};

export const requireAdmin = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError("Authentication required");
    }

    if (req.user.role === "admin") {
      next();
      return;
    }

    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount === 0) {
      const promotedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { role: "admin" },
      });
      req.user = promotedUser;
      next();
      return;
    }

    throw new ForbiddenError("Admin access required");
  } catch (error) {
    next(error);
  }
};
