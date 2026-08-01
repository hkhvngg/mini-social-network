import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorBody = {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const details = this.getSafeDetails(exceptionResponse, statusCode);
    const body: ErrorBody = {
      statusCode,
      message: details.message,
      error: details.error,
      path: request.originalUrl || request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private getSafeDetails(
    response: string | object | null,
    statusCode: number,
  ): { message: string | string[]; error: string } {
    if (typeof response === 'string') {
      return { message: response, error: this.statusText(statusCode) };
    }

    if (response && 'message' in response) {
      const message = response.message;
      const error =
        'error' in response && typeof response.error === 'string'
          ? response.error
          : this.statusText(statusCode);

      if (
        typeof message === 'string' ||
        (Array.isArray(message) &&
          message.every((item) => typeof item === 'string'))
      ) {
        return { message, error };
      }
    }

    return {
      message:
        statusCode === 500
          ? 'Internal server error'
          : this.statusText(statusCode),
      error: this.statusText(statusCode),
    };
  }

  private statusText(statusCode: number): string {
    const name = HttpStatus[statusCode];
    if (typeof name !== 'string') return 'Error';

    return name
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }
}
