import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';

export function addHttpServiceLogging(httpService: HttpService, logger: Logger) {
  httpService.axiosRef.interceptors.request.use(
    request => logger.log(`Http request ${JSON.stringify(request)}`),
    request => logger.error(`Http request ${JSON.stringify(request.message)}`),
  );
  httpService.axiosRef.interceptors.response.use(
    response => logger.log(`Http response ${JSON.stringify(response)}`),
    response => logger.error(`Http response ${response.message}`),
  );
}
