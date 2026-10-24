import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";

export interface AuthenticatedUser {
  id: string;
  phone: string;
}

export interface JwtPayload {
  userId: string;
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication token missing or invalid format. Expected 'Bearer <token>'" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET is not configured on the server" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (!decoded || !decoded.userId) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phone: true },
    });

    if (!user) {
      res.status(401).json({ error: "User associated with this token no longer exists" });
      return;
    }

    req.user = user;
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Authentication token has expired" });
      return;
    }

    res.status(401).json({ error: "Invalid authentication token" });
  }
};
