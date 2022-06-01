import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { readConfiguration } from '../../../utils/readConfiguration';

/**
 * Jwt strategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: readConfiguration(configService, new Logger(JwtStrategy.name), 'JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
