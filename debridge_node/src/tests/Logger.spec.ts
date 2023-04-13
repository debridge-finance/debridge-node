import { Logger } from '../Logger';
import * as Sentry from '@sentry/node';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    jest.clearAllMocks();
  });

  it('should log an error message without stack trace when Sentry DSN is not provided', () => {
    const errorMessage = 'Error message';
    jest.spyOn(Sentry, 'captureMessage').mockImplementation();
    logger.error(errorMessage);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(0);
  });

  it('should log an error message with stack trace when Sentry DSN is provided', () => {
    const errorMessage = 'Error message';
    const stackTrace = 'Stack trace';
    process.env.SENTRY_DSN = 'test-dsn';
    const mockCaptureMessage = jest.spyOn(Sentry, 'captureMessage').mockImplementation();

    logger.error(errorMessage, stackTrace);

    expect(mockCaptureMessage).toHaveBeenCalledWith(`[${stackTrace}] ${errorMessage}`);
    expect(process.env.SENTRY_DSN).toBe('test-dsn');

    mockCaptureMessage.mockRestore();
  });
});
