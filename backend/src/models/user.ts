import { query } from "../db/postgres.js";

export interface Tenant {
  id: string;
  name: string;
  created_at: Date;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: "admin" | "member";
  created_at: Date;
  updated_at: Date;
}

export type SafeUser = Omit<User, "password_hash">;

export const toSafeUser = (user: User): SafeUser => {
  const { password_hash: _, ...safe } = user;
  return safe;
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query("SELECT * FROM users WHERE email = $1", [email]);
  return (result.rows[0] as User | undefined) ?? null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return (result.rows[0] as User | undefined) ?? null;
};

export const createUser = async (params: {
  tenantId: string;
  email: string;
  passwordHash: string;
  role: "admin" | "member";
}): Promise<User> => {
  const result = await query(
    `INSERT INTO users (tenant_id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.tenantId, params.email, params.passwordHash, params.role],
  );
  return result.rows[0] as User;
};

export const createTenant = async (name: string): Promise<Tenant> => {
  const result = await query(
    "INSERT INTO tenants (name) VALUES ($1) RETURNING *",
    [name],
  );
  return result.rows[0] as Tenant;
};
