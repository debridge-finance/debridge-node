import { ConsoleLogger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

export class Logger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(message);
    }
    super.error(`[${context}] ${message}`);
  }
}
