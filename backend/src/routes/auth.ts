import { Router } from "express";
import { z } from "zod";
import {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyRefreshToken,
} from "../services/authService.js";
import {
  findUserByEmail,
  findUserById,
  createUser,
  createTenant,
  toSafeUser,
} from "../models/user.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantName: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { email, password, tenantName } = parsed.data;

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({
        success: false,
        error: "Email already registered",
        code: "EMAIL_EXISTS",
      });
      return;
    }

    const passwordHash = await hashPassword(password);
    const tenant = await createTenant(tenantName);
    const user = await createUser({
      tenantId: tenant.id,
      email,
      passwordHash,
      role: "admin",
    });

    const tokens = generateTokens(user.id, tenant.id, user.role);

    res.status(201).json({
      success: true,
      data: {
        user: toSafeUser(user),
        ...tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { email, password } = parsed.data;

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }

    const tokens = generateTokens(user.id, user.tenant_id, user.role);

    res.status(200).json({
      success: true,
      data: {
        user: toSafeUser(user),
        ...tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
        code: "VALIDATION_ERROR",
      });
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(parsed.data.refreshToken);
    } catch {
      res.status(401).json({
        success: false,
        error: "Invalid or expired refresh token",
        code: "INVALID_TOKEN",
      });
      return;
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: "User no longer exists",
        code: "INVALID_TOKEN",
      });
      return;
    }

    const { accessToken } = generateTokens(user.id, user.tenant_id, user.role);

    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.status(200).json({
    success: true,
    data: { message: "Logged out" },
  });
});
