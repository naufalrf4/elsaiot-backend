import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext } from '@nestjs/common';

export class ConfigurableSocketIoAdapter extends IoAdapter {
  private readonly configService: ConfigService;

  constructor(
    appOrHttpServer: INestApplicationContext,
    configService: ConfigService,
  ) {
    super(appOrHttpServer);
    this.configService = configService;
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const corsOrigin = this.configService.get<string>('app.corsOrigin') || '*';
    
    const optionsWithCORS = {
      ...options,
      cors: {
        origin: corsOrigin,
        credentials: true,
      },
    };
    
    return super.createIOServer(port, optionsWithCORS);
  }
} 