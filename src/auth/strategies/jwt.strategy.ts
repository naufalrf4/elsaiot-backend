import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '../../users/repositories/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('auth.jwt.secret'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    const { sub: id } = payload;

    const user = await this.userRepository.findByIdWithoutPassword(id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
