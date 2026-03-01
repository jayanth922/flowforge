import type { RequestHandler } from "express";
import { verifyAccessToken } from "../services/authService.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Missing or invalid token",
      code: "UNAUTHORIZED",
    });
    return;
  }

  const token = header.slice(7);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: "Missing or invalid token",
      code: "UNAUTHORIZED",
    });
  }
};

export const requireRole = (role: "admin" | "member"): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Missing or invalid token",
        code: "UNAUTHORIZED",
      });
      return;
    }

    if (role === "admin" && req.user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        code: "FORBIDDEN",
      });
      return;
    }

    next();
  };
};
