import { Socket } from 'socket.io';
import { User } from '../../users/entities/user.entity';

export interface SocketClient extends Socket {
  user?: User;
  data: {
    user?: User;
  };
} 