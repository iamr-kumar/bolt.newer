import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
