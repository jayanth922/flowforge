export interface IntegrationResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}
