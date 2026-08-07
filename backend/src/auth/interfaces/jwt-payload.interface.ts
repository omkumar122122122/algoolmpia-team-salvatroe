import { Role } from '../../common/enums/role.enum';

/**
 * Payload embedded in the JWT access token.
 */
export interface JwtPayload {
  /** User UUID */
  sub: string;
  /** User email */
  email: string;
  /** Assigned role */
  role: Role;
  /** Token type discriminator */
  type: 'access' | 'refresh';
  /** JWT ID — used for token family tracking & revocation */
  jti: string;
  /** Issued-at (seconds) */
  iat?: number;
  /** Expires-at (seconds) */
  exp?: number;
}

/**
 * Payload embedded in the JWT refresh token.
 * Extends access payload with refresh-specific fields.
 */
export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
  /** Parent token JTI — enables token rotation / family invalidation */
  parentJti?: string;
}
