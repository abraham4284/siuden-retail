import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuthenticatedUser } from '../auth/auth.types';
import { paginated, paginationArgs } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeUserRoleDto,
  CreatePlatformAdminDto,
  CreateUserDto,
  ResetUserPasswordDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(accountId: string, query: UserQueryDto) {
    const userIds = await this.findMatchingUserIds(query);
    const roleIds = query.roleCode
      ? (
          await this.prisma.role.findMany({
            where: { accountId, code: query.roleCode },
            select: { id: true },
          })
        ).map((role) => role.id)
      : undefined;
    const where: Prisma.AccountMemberWhereInput = {
      accountId,
      status: query.memberStatus,
      userId: userIds ? { in: userIds } : undefined,
      roleId: roleIds ? { in: roleIds } : undefined,
    };
    const [memberships, total] = await this.prisma.$transaction([
      this.prisma.accountMember.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.accountMember.count({ where }),
    ]);
    const data = await this.hydrateMemberships(memberships);
    return paginated(data, total, query);
  }

  async findOne(accountId: string, userId: string) {
    const membership = await this.getMembership(accountId, userId);
    return (await this.hydrateMemberships([membership]))[0];
  }

  async roles(accountId: string, includePlatformRole: boolean) {
    return this.prisma.role.findMany({
      where: {
        accountId,
        code: includePlatformRole ? undefined : { not: 'PLATFORM_ADMIN' },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto) {
    this.assertCanAssignRole(actor, dto.roleCode);
    const email = dto.email.trim().toLowerCase();
    try {
      const userId = await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.findUnique({
          where: {
            accountId_code: { accountId: actor.accountId, code: dto.roleCode },
          },
        });
        if (!role)
          throw new NotFoundException('Rol no encontrado en la cuenta');

        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) {
          const membership = await tx.accountMember.findUnique({
            where: {
              accountId_userId: {
                accountId: actor.accountId,
                userId: existing.id,
              },
            },
          });
          if (membership)
            throw new ConflictException(
              'El usuario ya pertenece a esta cuenta',
            );
          if (existing.status !== 'ACTIVE') {
            throw new ConflictException(
              'El email pertenece a un usuario que no está activo',
            );
          }
          await tx.accountMember.create({
            data: {
              id: crypto.randomUUID(),
              accountId: actor.accountId,
              userId: existing.id,
              roleId: role.id,
              status: 'ACTIVE',
              joinedAt: new Date(),
            },
          });
          return existing.id;
        }

        const created = await tx.user.create({
          data: {
            id: crypto.randomUUID(),
            email,
            passwordHash: await hash(dto.password, 12),
            displayName: dto.displayName.trim(),
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
          },
        });
        await tx.accountMember.create({
          data: {
            id: crypto.randomUUID(),
            accountId: actor.accountId,
            userId: created.id,
            roleId: role.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
        });
        return created.id;
      });
      return this.findOne(actor.accountId, userId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El email o la membresía ya existe');
      }
      throw error;
    }
  }

  async update(actor: AuthenticatedUser, userId: string, dto: UpdateUserDto) {
    const membership = await this.getMembership(actor.accountId, userId);
    const targetRole = await this.getRole(actor.accountId, membership.roleId);
    this.assertCanManageTarget(actor, targetRole.code);
    if (
      actor.userId === userId &&
      dto.memberStatus &&
      dto.memberStatus !== 'ACTIVE'
    ) {
      throw new ForbiddenException('No podés bloquear tu propia membresía');
    }
    await this.prisma.$transaction(async (tx) => {
      if (dto.displayName !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { displayName: dto.displayName.trim() },
        });
      }
      if (dto.memberStatus !== undefined) {
        await tx.accountMember.update({
          where: { id: membership.id },
          data: {
            status: dto.memberStatus,
            joinedAt:
              dto.memberStatus === 'ACTIVE'
                ? (membership.joinedAt ?? new Date())
                : undefined,
          },
        });
      }
    });
    return this.findOne(actor.accountId, userId);
  }

  async changeRole(
    actor: AuthenticatedUser,
    userId: string,
    dto: ChangeUserRoleDto,
  ) {
    const membership = await this.getMembership(actor.accountId, userId);
    const currentRole = await this.getRole(actor.accountId, membership.roleId);
    this.assertCanManageTarget(actor, currentRole.code);
    this.assertCanAssignRole(actor, dto.roleCode);
    if (actor.userId === userId) {
      throw new ForbiddenException('No podés cambiar tu propio rol');
    }
    const role = await this.prisma.role.findUnique({
      where: {
        accountId_code: { accountId: actor.accountId, code: dto.roleCode },
      },
    });
    if (!role) throw new NotFoundException('Rol no encontrado en la cuenta');
    await this.prisma.accountMember.update({
      where: { id: membership.id },
      data: { roleId: role.id },
    });
    return this.findOne(actor.accountId, userId);
  }

  async resetPassword(
    actor: AuthenticatedUser,
    userId: string,
    dto: ResetUserPasswordDto,
  ) {
    const membership = await this.getMembership(actor.accountId, userId);
    const targetRole = await this.getRole(actor.accountId, membership.roleId);
    this.assertCanManageTarget(actor, targetRole.code);
    const membershipCount = await this.prisma.accountMember.count({
      where: { userId },
    });
    if (membershipCount > 1 && actor.roleCode !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException(
        'Solo un administrador global puede resetear la contraseña de un usuario compartido entre cuentas',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(dto.password, 12) },
    });
    return { message: 'Contraseña actualizada correctamente' };
  }

  async createPlatformAdmin(dto: CreatePlatformAdminDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const userId = crypto.randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          email,
          passwordHash: await hash(dto.password, 12),
          displayName: dto.displayName.trim(),
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });
      const accounts = await tx.account.findMany({
        where: { status: { not: 'CANCELLED' } },
        select: { id: true },
      });
      const permissions = await tx.permission.findMany({
        select: { id: true },
      });
      for (const account of accounts) {
        const role = await tx.role.upsert({
          where: {
            accountId_code: { accountId: account.id, code: 'PLATFORM_ADMIN' },
          },
          create: {
            id: crypto.randomUUID(),
            accountId: account.id,
            code: 'PLATFORM_ADMIN',
            name: 'Administrador global',
            description: 'Administra todas las cuentas y tenants disponibles',
            isSystem: true,
          },
          update: { isSystem: true },
        });
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
        await tx.accountMember.create({
          data: {
            id: crypto.randomUUID(),
            accountId: account.id,
            userId,
            roleId: role.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
        });
      }
    });
    return {
      id: userId,
      email,
      displayName: dto.displayName.trim(),
      roleCode: 'PLATFORM_ADMIN',
    };
  }

  private async findMatchingUserIds(
    query: UserQueryDto,
  ): Promise<string[] | undefined> {
    if (!query.search && !query.userStatus) return undefined;
    return (
      await this.prisma.user.findMany({
        where: {
          status: query.userStatus,
          OR: query.search
            ? [
                { email: { contains: query.search } },
                { displayName: { contains: query.search } },
              ]
            : undefined,
        },
        select: { id: true },
      })
    ).map((user) => user.id);
  }

  private async hydrateMemberships(
    memberships: Array<{
      id: string;
      accountId: string;
      userId: string;
      roleId: string;
      status: MemberStatus;
      joinedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    const [users, roles] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: memberships.map((item) => item.userId) } },
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.role.findMany({
        where: { id: { in: memberships.map((item) => item.roleId) } },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          isSystem: true,
        },
      }),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const rolesById = new Map(roles.map((role) => [role.id, role]));
    return memberships.map((membership) => ({
      ...usersById.get(membership.userId),
      membership: {
        id: membership.id,
        status: membership.status,
        joinedAt: membership.joinedAt,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
        role: rolesById.get(membership.roleId),
      },
    }));
  }

  private async getMembership(accountId: string, userId: string) {
    const membership = await this.prisma.accountMember.findUnique({
      where: { accountId_userId: { accountId, userId } },
    });
    if (!membership)
      throw new NotFoundException('Usuario no encontrado en esta cuenta');
    return membership;
  }

  private async getRole(accountId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, accountId },
    });
    if (!role) throw new NotFoundException('Rol no encontrado en la cuenta');
    return role;
  }

  private assertCanManageTarget(
    actor: AuthenticatedUser,
    targetRoleCode: string,
  ): void {
    if (
      targetRoleCode === 'PLATFORM_ADMIN' &&
      actor.roleCode !== 'PLATFORM_ADMIN'
    ) {
      throw new ForbiddenException(
        'Solo otro administrador global puede modificar este usuario',
      );
    }
    if (targetRoleCode === 'OWNER' && actor.roleCode === 'ADMIN') {
      throw new ForbiddenException(
        'Un administrador no puede modificar al propietario de la cuenta',
      );
    }
  }

  private assertCanAssignRole(
    actor: AuthenticatedUser,
    roleCode: string,
  ): void {
    if (roleCode === 'OWNER' && actor.roleCode === 'ADMIN') {
      throw new ForbiddenException(
        'Solo el propietario o un administrador global puede asignar OWNER',
      );
    }
  }
}
