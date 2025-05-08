import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/**
 * Extracts the authenticated user from the request
 * Can be used with optional property path to get specific properties
 *
 * @example
 * // Get entire user object
 * @CurrentUser() user: User
 *
 * @example
 * // Get specific property
 * @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (
    propertyPath: string | undefined,
    ctx: ExecutionContext,
  ): User | Partial<User> | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Return the specific property if requested
    if (propertyPath) {
      const properties = propertyPath.split('.');
      return properties.reduce((obj, prop) => obj?.[prop], user);
    }

    return user;
  },
);
