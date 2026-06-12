import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : String(exception);
      
    const stack = 
      exception instanceof Error ? exception.stack : undefined;

    console.error('GLOBAL ERROR:', exception);

    response.status(status).json({
      statusCode: status,
      message: message,
      error: exception instanceof HttpException ? exception.getResponse() : 'Internal Server Error',
      stack: stack,
    });
  }
}
