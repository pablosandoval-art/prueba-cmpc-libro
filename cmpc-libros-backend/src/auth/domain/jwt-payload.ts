/** Claims del access token. `sub` = id del usuario (RFC 7519). */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}
