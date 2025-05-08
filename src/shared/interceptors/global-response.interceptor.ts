import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginationMeta } from '../interfaces/pagination.interface';

export interface Response<T> {
  status: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta | Record<string, any>;
}

@Injectable()
export class GlobalResponseInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    // Get the request to potentially use for customization
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Generate default message based on HTTP method if none provided
    let defaultMessage = 'Operation successful';
    switch (method) {
      case 'POST':
        defaultMessage = 'Resource created successfully';
        break;
      case 'PUT':
        defaultMessage = 'Resource updated successfully';
        break;
      case 'DELETE':
        defaultMessage = 'Resource deleted successfully';
        break;
      case 'GET':
        defaultMessage = 'Data retrieved successfully';
        break;
    }

    return next.handle().pipe(
      map((result) => {
        // If result is already in our format, return it as is
        if (
          result &&
          typeof result === 'object' &&
          'status' in result &&
          'message' in result &&
          'data' in result
        ) {
          return result;
        }

        // Check if the result is a paginated result with standardized structure
        if (
          result &&
          typeof result === 'object' &&
          'data' in result &&
          'meta' in result &&
          result.meta &&
          typeof result.meta === 'object'
        ) {
          return {
            status: true,
            message: result.message || defaultMessage,
            data: result.data,
            meta: result.meta,
          };
        }

        // Check if there's a custom message provided in the result
        const message = result?.message || defaultMessage;

        // Remove message from result if it exists
        let responseData = result;
        if (result?.message) {
          const { message, ...rest } = result;
          responseData = rest;
        }

        // Handle metadata if present
        let meta = undefined;
        if (responseData?.meta) {
          const { meta: metaData, ...rest } = responseData;
          meta = metaData;
          responseData = rest;
        }

        // Return formatted response
        const response: Response<T> = {
          status: true,
          message,
          data: responseData,
        };

        if (meta) {
          response.meta = meta;
        }

        return response;
      }),
    );
  }
}
