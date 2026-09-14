import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { paginated, paginationArgs } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AccountQueryDto, CreateAccountDto } from './dto/account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AccountQueryDto) {
    const where: Prisma.AccountWhereInput = {
      OR: query.search ? [{ name: { contains: query.search } }] : undefined,
    };
    const [accounts, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.account.count({ where }),
    ]);
    const tenants = await this.prisma.tenant.findMany({
      where: { accountId: { in: accounts.map((account) => account.id) } },
      orderBy: { createdAt: 'asc' },
    });
    return paginated(
      accounts.map((account) => ({
        ...account,
        tenants: tenants.filter((tenant) => tenant.accountId === account.id),
      })),
      total,
      query,
    );
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    const tenants = await this.prisma.tenant.findMany({
      where: { accountId: id },
      orderBy: { createdAt: 'asc' },
    });
    return { ...account, tenants };
  }

  async create(userId: string, dto: CreateAccountDto) {
    const accountId = crypto.randomUUID();
    const tenantId = crypto.randomUUID();
    try {
      await this.prisma.$transaction(async (tx) => {
        const existingPlatformRoles = await tx.role.findMany({
          where: { code: 'PLATFORM_ADMIN' },
          select: { id: true },
        });
        const existingPlatformMembers = await tx.accountMember.findMany({
          where: {
            roleId: { in: existingPlatformRoles.map((role) => role.id) },
            status: 'ACTIVE',
          },
          select: { userId: true },
        });
        const platformUserIds = [
          ...new Set([
            userId,
            ...existingPlatformMembers.map((member) => member.userId),
          ]),
        ];
        await tx.account.create({
          data: {
            id: accountId,
            name: dto.accountName.trim(),
            status: 'ACTIVE',
          },
        });
        await tx.tenant.create({
          data: {
            id: tenantId,
            accountId,
            name: dto.tenantName.trim(),
            slug: dto.slug,
            status: 'ACTIVE',
            defaultCurrency: dto.defaultCurrency,
            timeZone: dto.timeZone,
            enabled: true,
          },
        });
        const permissions = await tx.permission.findMany({
          select: { id: true, code: true },
        });
        const roleDefinitions = [
          ['PLATFORM_ADMIN', 'Administrador global'],
          ['OWNER', 'Propietario'],
          ['ADMIN', 'Administrador'],
          ['SELLER', 'Vendedor'],
          ['STOCK_MANAGER', 'Responsable de stock'],
        ] as const;
        const roleIds = new Map<string, string>();
        for (const [code, name] of roleDefinitions) {
          const role = await tx.role.create({
            data: {
              id: crypto.randomUUID(),
              accountId,
              code,
              name,
              isSystem: true,
            },
          });
          roleIds.set(code, role.id);
          const permissionCodes = this.permissionCodesForRole(code);
          await tx.rolePermission.createMany({
            data: permissions
              .filter(
                (permission) =>
                  code === 'PLATFORM_ADMIN' ||
                  permissionCodes.includes(permission.code),
              )
              .map((permission) => ({
                roleId: role.id,
                permissionId: permission.id,
              })),
          });
        }
        await tx.accountMember.createMany({
          data: platformUserIds.map((platformUserId) => ({
            id: crypto.randomUUID(),
            accountId,
            userId: platformUserId,
            roleId: roleIds.get('PLATFORM_ADMIN')!,
            status: 'ACTIVE' as const,
            joinedAt: new Date(),
          })),
        });
        if (dto.owner) {
          const ownerEmail = dto.owner.email.trim().toLowerCase();
          const existingOwner = await tx.user.findUnique({
            where: { email: ownerEmail },
          });
          if (existingOwner && existingOwner.status !== 'ACTIVE') {
            throw new ConflictException(
              'El email del propietario pertenece a un usuario que no está activo',
            );
          }
          const owner =
            existingOwner ??
            (await tx.user.create({
              data: {
                id: crypto.randomUUID(),
                email: ownerEmail,
                passwordHash: await hash(dto.owner.password, 12),
                displayName: dto.owner.displayName.trim(),
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
              },
            }));
          if (platformUserIds.includes(owner.id)) {
            throw new ConflictException(
              'El propietario debe ser distinto de un administrador global',
            );
          }
          await tx.accountMember.create({
            data: {
              id: crypto.randomUUID(),
              accountId,
              userId: owner.id,
              roleId: roleIds.get('OWNER')!,
              status: 'ACTIVE',
              joinedAt: new Date(),
            },
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('La cuenta, tenant o usuario ya existe');
      }
      throw error;
    }
    return this.findOne(accountId);
  }

  private permissionCodesForRole(roleCode: string): string[] {
    if (roleCode === 'PLATFORM_ADMIN') return [];
    const common = [
      'store.read',
      'products.read',
      'inventory.read',
      'customers.read',
      'sales.read',
    ];
    if (roleCode === 'OWNER' || roleCode === 'ADMIN') {
      return [
        ...common,
        'store.update',
        'store.theme.update',
        'products.write',
        'categories.write',
        'inventory.adjust',
        'customers.write',
        'sales.create',
        'sales.cancel',
        'pos.use',
        'orders.manage',
        'users.manage',
        'roles.manage',
        'purchases.read',
        'purchases.write',
      ];
    }
    if (roleCode === 'SELLER') {
      return [...common, 'customers.write', 'sales.create', 'pos.use'];
    }
    return [
      'products.read',
      'products.write',
      'categories.write',
      'inventory.read',
      'inventory.adjust',
      'purchases.read',
      'purchases.write',
    ];
  }
}
