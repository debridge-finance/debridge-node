import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export function readConfiguration(configService: ConfigService, logger: Logger | Console, property: string) {
  const value = configService.get(property);
  if (value === undefined) {
    const message = `There is no property ${property} in config`;
    logger.error(message);
    throw new Error(message);
  }
  return value;
}
