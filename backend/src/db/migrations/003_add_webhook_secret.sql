ALTER TABLE workflows
  ADD COLUMN webhook_secret VARCHAR(64) UNIQUE,
  ADD COLUMN webhook_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_workflows_webhook_secret
  ON workflows (webhook_secret) WHERE webhook_secret IS NOT NULL;
