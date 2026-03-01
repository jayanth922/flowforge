import { query } from "../db/postgres.js";
import { encrypt, decrypt } from "../utils/encryption.js";

export type IntegrationService = "slack" | "discord" | "github" | "http";

export interface IntegrationSummary {
  id: string;
  tenant_id: string;
  service: IntegrationService;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export const createIntegration = async (
  tenantId: string,
  service: IntegrationService,
  name: string,
  credentials: Record<string, unknown>,
): Promise<IntegrationSummary> => {
  const encrypted = encrypt(JSON.stringify(credentials));
  const result = await query(
    `INSERT INTO tenant_integrations (tenant_id, service, name, credentials)
     VALUES ($1, $2, $3, $4)
     RETURNING id, tenant_id, service, name, created_at, updated_at`,
    [tenantId, service, name, encrypted],
  );
  return result.rows[0] as IntegrationSummary;
};

export const listIntegrations = async (
  tenantId: string,
  service?: IntegrationService,
): Promise<IntegrationSummary[]> => {
  if (service) {
    const result = await query(
      `SELECT id, tenant_id, service, name, created_at, updated_at
       FROM tenant_integrations
       WHERE tenant_id = $1 AND service = $2
       ORDER BY created_at DESC`,
      [tenantId, service],
    );
    return result.rows as IntegrationSummary[];
  }

  const result = await query(
    `SELECT id, tenant_id, service, name, created_at, updated_at
     FROM tenant_integrations
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [tenantId],
  );
  return result.rows as IntegrationSummary[];
};

export const getIntegrationById = async (
  id: string,
  tenantId: string,
): Promise<{
  summary: IntegrationSummary;
  decryptedCredentials: Record<string, unknown>;
} | null> => {
  const result = await query(
    "SELECT * FROM tenant_integrations WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  const row = result.rows[0] as
    | (IntegrationSummary & { credentials: string })
    | undefined;
  if (!row) return null;

  const decryptedCredentials = JSON.parse(decrypt(row.credentials)) as Record<
    string,
    unknown
  >;
  const { credentials: _, ...summary } = row;
  return { summary, decryptedCredentials };
};

export const deleteIntegration = async (
  id: string,
  tenantId: string,
): Promise<boolean> => {
  const result = await query(
    "DELETE FROM tenant_integrations WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  return (result.rowCount ?? 0) > 0;
};
