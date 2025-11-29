import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { IJwtPayload, IJwtPayloadWithRt } from 'src/types';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_REFRESH_SECRET || 'rt-secret',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: IJwtPayload): IJwtPayloadWithRt {
    const refreshToken = req.get('authorization')?.replace('Bearer', '').trim();

    if (!refreshToken) {
      throw new Error('Refresh token malformed');
    }

    return {
      ...payload,
      refreshToken,
    };
  }
}
