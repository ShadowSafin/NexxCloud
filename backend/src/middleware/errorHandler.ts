import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({
      success: false,
      error: "CORS blocking: Origin not allowed",
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle Prisma unique constraint errors
  if (err.name === "PrismaClientKnownRequestError" && (err as any).code === "P2002") {
    const field = (err as any).meta?.target?.[0] || "field";
    res.status(409).json({
      success: false,
      error: `A record with this ${field} already exists`,
    });
    return;
  }

  // Handle Prisma foreign key constraint errors
  if (err.name === "PrismaClientKnownRequestError" && (err as any).code === "P2003") {
    res.status(400).json({
      success: false,
      error: "Invalid reference. The related record does not exist.",
    });
    return;
  }

  // Handle Prisma record not found
  if (err.name === "PrismaClientKnownRequestError" && (err as any).code === "P2025") {
    res.status(404).json({
      success: false,
      error: "Record not found",
    });
    return;
  }

  // Handle multer errors
  if (err.name === "MulterError") {
    if (err.message === "File too large") {
      res.status(413).json({
        success: false,
        error: "File too large",
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Log unexpected errors
  console.error("Unexpected error:", err);

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
};
