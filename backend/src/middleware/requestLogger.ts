import pinoHttp from "pino-http";
import type { IncomingMessage } from "node:http";
import { logger } from "../utils/logger.js";

export const requestLogger = (pinoHttp as unknown as typeof pinoHttp.default)({
  logger,
  autoLogging: true,
  customProps: (req: IncomingMessage) => {
    const user = (req as IncomingMessage & { user?: { userId?: string; tenantId?: string } }).user;

    return {
      ...(user?.userId && { userId: user.userId }),
      ...(user?.tenantId && { tenantId: user.tenantId }),
    };
  },
});
