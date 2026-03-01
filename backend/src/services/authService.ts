import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthPayload } from "../types/express.js";

const SALT_ROUNDS = 12;

const getSecret = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} environment variable is not set`);
  return value;
};

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export const generateTokens = (
  userId: string,
  tenantId: string,
  role: "admin" | "member",
): { accessToken: string; refreshToken: string } => {
  const payload: AuthPayload = { userId, tenantId, role };

  const accessToken = jwt.sign(payload, getSecret("JWT_SECRET"), {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign(payload, getSecret("JWT_REFRESH_SECRET"), {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): AuthPayload => {
  const decoded = jwt.verify(token, getSecret("JWT_SECRET"));
  return decoded as AuthPayload;
};

export const verifyRefreshToken = (token: string): AuthPayload => {
  const decoded = jwt.verify(token, getSecret("JWT_REFRESH_SECRET"));
  return decoded as AuthPayload;
};
