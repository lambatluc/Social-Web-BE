export interface ITokens {
  access_token: string;
  refresh_token: string;
}

export interface IJwtPayload {
  sub: string;
  email: string;
}

export interface IJwtPayloadWithRt extends IJwtPayload {
  refreshToken: string;
}
