import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { User } from '../../users/entities/user.entity';

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

    if (propertyPath) {
      const properties = propertyPath.split('.');
      return properties.reduce((obj, prop) => obj?.[prop], user);
    }

    return user;
  },
); 