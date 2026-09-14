import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './auth.types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    const memberships = await this.prisma.accountMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
    });
    const accountIds = memberships.map((membership) => membership.accountId);
    const tenant = dto.tenantId
      ? await this.prisma.tenant.findFirst({
          where: {
            id: dto.tenantId,
            accountId: { in: accountIds },
            status: 'ACTIVE',
            enabled: true,
          },
        })
      : await this.prisma.tenant.findFirst({
          where: {
            accountId: { in: accountIds },
            status: 'ACTIVE',
            enabled: true,
          },
          orderBy: { createdAt: 'asc' },
        });
    if (!tenant)
      throw new UnauthorizedException(
        'El usuario no tiene acceso a un tenant activo',
      );

    const membership = memberships.find(
      (item) => item.accountId === tenant.accountId,
    );
    if (!membership) throw new UnauthorizedException('Membresía inválida');
    const role = await this.prisma.role.findFirst({
      where: { id: membership.roleId, accountId: tenant.accountId },
    });
    if (!role)
      throw new UnauthorizedException('El rol de la membresía no existe');
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: rolePermissions.map((item) => item.permissionId) } },
      select: { code: true },
    });

    const payload: AuthenticatedUser = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      accountId: tenant.accountId,
      tenantId: tenant.id,
      roleId: role.id,
      roleCode: role.code,
      permissions: permissions.map((permission) => permission.code),
    };
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: payload,
      tenant,
    };
  }
}
