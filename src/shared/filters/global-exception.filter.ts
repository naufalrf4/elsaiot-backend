import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    
    // Handle known HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      // Handle validation errors (typically from class-validator)
      if (
        typeof exceptionResponse === 'object' && 
        exceptionResponse !== null && 
        'message' in exceptionResponse
      ) {
        const exceptionMessage = exceptionResponse['message'];
        
        // If the message is an array (like validation errors)
        if (Array.isArray(exceptionMessage)) {
          message = exceptionMessage;
        } else {
          message = exceptionMessage as string;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Handle other known errors
      message = exception.message;
    }

    // Log the error (except for 4xx client errors)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}: ${
          typeof message === 'string' ? message : JSON.stringify(message)
        }`,
        exception instanceof Error ? exception.stack : '',
      );
    } else {
      this.logger.log(
        `${request.method} ${request.url} - ${status}: ${
          typeof message === 'string' ? message : JSON.stringify(message)
        }`,
      );
    }

    // Return consistent error format
    response.status(status).json({
      status: false,
      message,
      data: null,
    });
  }
} 