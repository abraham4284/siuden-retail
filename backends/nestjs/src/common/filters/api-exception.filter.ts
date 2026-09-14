import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let messages: string[] = ['Ocurrió un error interno'];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = exception.name.replace(/Exception$/, '') || 'Error';
      const payload = exception.getResponse();
      if (typeof payload === 'string') messages = [payload];
      else if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload
      ) {
        const message = (payload as { message: string | string[] }).message;
        messages = Array.isArray(message) ? message : [message];
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        error = 'Conflict';
        messages = ['Ya existe un registro con esos datos'];
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        messages = [
          'La operación referencia datos inexistentes o todavía utilizados',
        ];
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        messages = ['El recurso solicitado no existe'];
      }
    }

    response.status(status).json({
      statusCode: status,
      error,
      message: messages,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
