import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { readConfiguration } from '../readConfiguration';

const getConfigService = jest.fn().mockReturnValue({});
const errorLogger = jest.fn().mockReturnValue({});

const configService: ConfigService = {
  get: getConfigService,
} as unknown as ConfigService;
const logger: Logger = {
  error: errorLogger,
} as unknown as Logger;

describe('readConfiguration', () => {
  beforeEach(() => {
    getConfigService.mockReset();
    errorLogger.mockReset();
  });

  it('should return a value if the property exists', () => {
    const expectedValue = 'some value';
    getConfigService.mockReturnValue(expectedValue);

    const result = readConfiguration(configService, logger, 'someProperty');

    expect(result).toBe(expectedValue);
    expect(getConfigService).toHaveBeenCalledWith('someProperty');
    expect(errorLogger).not.toHaveBeenCalled();
  });

  it('should throw an error if the property does not exist', () => {
    const propertyName = 'someProperty';
    getConfigService.mockReturnValue(undefined);
    const expectedErrorMessage = `There is no property ${propertyName} in config`;

    const action = () => readConfiguration(configService, logger, propertyName);

    expect(action).toThrow(expectedErrorMessage);
    expect(getConfigService).toHaveBeenCalledWith(propertyName);
    expect(errorLogger).toHaveBeenCalledWith(expectedErrorMessage);
  });
});
