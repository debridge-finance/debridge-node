import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';

export function addHttpServiceLogging(httpService: HttpService, logger: Logger) {
  httpService.axiosRef.interceptors.request.use(
    request => {
      const method = request.method;
      const url = request.url;
      const params = JSON.stringify(request.params);
      const data = JSON.stringify(request.data);
      logger.verbose(`Http request ${method} ${url} params ${params} data ${data}`);
      return request;
    },
    request => {
      logger.error(`Http request ${JSON.stringify(request.message)}`);
      return Promise.reject(request);
    },
  );
  httpService.axiosRef.interceptors.response.use(
    response => {
      const request = response.config;
      const method = request.method;
      const url = request.url;
      const params = JSON.stringify(request.params);
      const data = JSON.stringify(request.data);
      const responseData = JSON.stringify(response.data);

      logger.verbose(
        `Http response request: ${method} ${url} params ${params} data ${data} statusText: ${
          response.statusText
        } data: ${responseData}`,
      );
      return response;
    },
    response => {
      logger.error(`Http response ${JSON.stringify(response)}`);
      return Promise.reject(response);
    },
  );
}
