import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';

export function addHttpServiceLogging(httpService: HttpService, logger: Logger) {
  httpService.axiosRef.interceptors.request.use(
    request => {
      logger.verbose(`Http request ${JSON.stringify(request)}`);
      return request;
    },
    request => {
      logger.error(`Http request ${JSON.stringify(request.message)}`);
      return Promise.reject(request);
    },
  );
  httpService.axiosRef.interceptors.response.use(
    response => {
      logger.verbose(
        `Http response config: ${JSON.stringify(response.config)} status: ${response.status} statusText: ${
          response.statusText
        } headers: ${JSON.stringify(response.headers)} data: ${JSON.stringify(response.data)}`,
      );
      return response;
    },
    response => {
      logger.error(`Http response ${JSON.stringify(response)}`);
      return Promise.reject(response);
    },
  );
}
