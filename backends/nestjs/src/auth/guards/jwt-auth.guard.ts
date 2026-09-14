import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { readCookie } from '../../common/utils/cookies';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser, RequestWithUser } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Falta el token de acceso');
    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token);
      const [user, tenant, membership] = await Promise.all([
        this.prisma.user.findFirst({
          where: { id: payload.userId, status: 'ACTIVE' },
        }),
        this.prisma.tenant.findFirst({
          where: {
            id: payload.tenantId,
            accountId: payload.accountId,
            status: 'ACTIVE',
            enabled: true,
          },
        }),
        this.prisma.accountMember.findFirst({
          where: {
            userId: payload.userId,
            accountId: payload.accountId,
            status: 'ACTIVE',
          },
        }),
      ]);
      if (!user || !tenant || !membership) {
        throw new UnauthorizedException('La sesión ya no tiene acceso activo');
      }
      const role = await this.prisma.role.findFirst({
        where: { id: membership.roleId, accountId: payload.accountId },
      });
      if (!role)
        throw new UnauthorizedException('El rol de la sesión ya no existe');
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { roleId: role.id },
        select: { permissionId: true },
      });
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: rolePermissions.map((item) => item.permissionId) } },
        select: { code: true },
      });
      (request as unknown as RequestWithUser).user = {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        accountId: payload.accountId,
        tenantId: payload.tenantId,
        roleId: role.id,
        roleCode: role.code,
        permissions: permissions.map((permission) => permission.code),
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token inválido o vencido');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer') return token;
    return readCookie(request.headers.cookie, 'siuden_admin_access_token');
  }
}
