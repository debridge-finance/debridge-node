import { Logger } from '@nestjs/common';
import { readConfiguration } from '../readConfiguration';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceSimpleMock } from '../../tests/mocks/config.service.simple.mock';
const logger = new Logger();

describe('readConfiguration', () => {
  it('should return value', async () => {
    const name = 'name';
    expect(readConfiguration(new ConfigServiceSimpleMock() as ConfigService, logger, name)).toBe(name);
  });

  it('should throw error', async () => {
    const name = 'name';
    const configService = {
      get: (key: string) => {
        return undefined;
      },
    };
    try {
      readConfiguration(configService as ConfigService, logger, name);
    } catch (e) {
      expect(e.message).toBe(`There is no property ${name} in config`);
    }
  });
});
