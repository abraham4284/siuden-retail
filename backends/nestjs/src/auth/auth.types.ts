import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  displayName: string;
  accountId: string;
  tenantId: string;
  roleId: string;
  roleCode: string;
  permissions: string[];
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
