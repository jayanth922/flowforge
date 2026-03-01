export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: "admin" | "member";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
