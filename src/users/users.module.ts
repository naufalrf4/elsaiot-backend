import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
  ],
  controllers: [UserController],
  providers: [
    UserRepository,
    RefreshTokenRepository,
    UserService,
  ],
  exports: [
    TypeOrmModule,
    UserRepository,
    RefreshTokenRepository,
    UserService,
  ],
})
export class UsersModule {} 