import { UserRole } from '../../users/enums/user-role.enum';

// Shape of the data encoded inside every JWT token.
// `sub` is the standard JWT claim for the subject (user id).
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
