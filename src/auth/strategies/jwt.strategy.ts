import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { UserService } from '../../user/user.service';

export interface JwtPayload {
  sub: string;
  phone: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userService.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
