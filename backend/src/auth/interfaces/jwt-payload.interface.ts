import { Role } from '../../common/enums/role.enum';

/**
 * Payload embedded in the JWT access token.
 */
export interface JwtPayload {
  /** User UUID */
  sub: string;
<<<<<<< HEAD
=======
  /** User UUID alias */
  userId?: string;
>>>>>>> origin/rohit
  /** User email */
  email: string;
  /** Assigned role */
  role: Role;
<<<<<<< HEAD
=======
  /** Associated Orphanage UUID (for ORPHANAGE or STAFF role) */
  orphanageId?: string;
>>>>>>> origin/rohit
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
