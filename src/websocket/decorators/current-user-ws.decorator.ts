import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { User } from '../../users/entities/user.entity';

/**
 * Extracts the authenticated user from the WebSocket connection.
 * Can be used with optional property path to get specific properties.
 *
 * @example
 * // Get entire user object
 * @CurrentUserWs() user: User
 *
 * @example
 * // Get specific property
 * @CurrentUserWs('id') userId: string
 */
export const CurrentUserWs = createParamDecorator(
  (
    propertyPath: string | undefined,
    ctx: ExecutionContext,
  ): User | Partial<User> | any => {
    const client = ctx.switchToWs().getClient();
    const user = client.data?.user;

    if (!user) {
      throw new WsException('User not found in WebSocket context');
    }

    // Return the specific property if requested
    if (propertyPath) {
      const properties = propertyPath.split('.');
      return properties.reduce((obj, prop) => obj?.[prop], user);
    }

    return user;
  },
); 