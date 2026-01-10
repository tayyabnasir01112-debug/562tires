import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: {
        userId?: number;
        username?: string;
        role?: string;
        destroy?: (callback?: (err?: any) => void) => void;
      };
    }
  }
}

// Authentication middleware - checks if user is logged in
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized - Please login" });
  }

  // Refresh user data from database
  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isActive) {
    req.session.destroy?.(() => {});
    return res.status(401).json({ message: "Unauthorized - Invalid session" });
  }

  req.user = user;
  next();
}

// Role-based authorization middleware
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.role) {
      return res.status(401).json({ message: "Unauthorized - Please login" });
    }

    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }

    next();
  };
}


// Check if user has access to a specific route
export function hasRole(userRole: string, requiredRole: string[]): boolean {
  return requiredRole.includes(userRole);
}

// Verify password
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

