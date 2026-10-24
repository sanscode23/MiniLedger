import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File size exceeds 5MB limit" });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ") || "Validation failed";
    res.status(400).json({ error: message });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON payload" });
    return;
  }

  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: "Internal server error" });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};
