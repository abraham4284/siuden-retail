import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from '../auth.types';
import { GLOBAL_ADMIN_KEY } from '../decorators/global-admin.decorator';

@Injectable()
export class GlobalAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      GLOBAL_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    if (user.roleCode !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException(
        'Este endpoint requiere un administrador global',
      );
    }
    return true;
  }
}
