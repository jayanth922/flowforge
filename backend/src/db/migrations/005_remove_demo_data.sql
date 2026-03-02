-- Remove demo tenant and demo user (demo@flowforge.com) and all related data.
-- Idempotent: safe to run multiple times; no-op if already cleaned.

-- 1. Delete workflow executions for demo tenant (workflows cascade will handle these,
--    but we delete explicitly to be clear; alternatively workflows DELETE cascades)
DELETE FROM workflow_executions
WHERE EXISTS (
  SELECT 1 FROM users u
  WHERE u.email = 'demo@flowforge.com'
  AND u.tenant_id = workflow_executions.tenant_id
);

-- 2. Delete workflows for demo tenant (cascades to workflow_executions if any remain)
DELETE FROM workflows
WHERE EXISTS (
  SELECT 1 FROM users u
  WHERE u.email = 'demo@flowforge.com'
  AND u.tenant_id = workflows.tenant_id
);

-- 3. Delete tenant integrations for demo tenant
DELETE FROM tenant_integrations
WHERE EXISTS (
  SELECT 1 FROM users u
  WHERE u.email = 'demo@flowforge.com'
  AND u.tenant_id = tenant_integrations.tenant_id
);

-- 4. Delete the demo user
DELETE FROM users
WHERE email = 'demo@flowforge.com';

-- 5. Delete the demo tenant (FlowForge Demo from seed)
DELETE FROM tenants
WHERE name = 'FlowForge Demo';
