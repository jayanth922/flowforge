CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'partial');

CREATE TABLE workflows (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255)    NOT NULL,
  description TEXT,
  created_by  UUID            REFERENCES users(id) ON DELETE SET NULL,
  status      workflow_status NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE workflow_executions (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID             NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  tenant_id       UUID             NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  triggered_by    UUID             REFERENCES users(id) ON DELETE SET NULL,
  status          execution_status NOT NULL DEFAULT 'pending',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  trigger_payload JSONB,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX idx_wf_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_wf_executions_tenant_id ON workflow_executions(tenant_id);
CREATE INDEX idx_wf_executions_status ON workflow_executions(status);
