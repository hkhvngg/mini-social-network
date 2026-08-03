import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../types/auth-user.type';
import { JwtPayload } from '../types/jwt-payload.type';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (
      typeof payload.sub !== 'string' ||
      payload.sub === '' ||
      typeof payload.username !== 'string' ||
      payload.username === ''
    ) {
      throw new UnauthorizedException();
    }

    const person = await this.usersService.findById(payload.sub);
    if (!person || person.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      personId: person.personId,
      username: person.username,
      role: person.role,
      accountStatus: person.accountStatus,
    };
  }
}
