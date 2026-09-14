import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    await this.prisma.$transaction(async (tx) => {
      await tx.account.create({
        data: { id: accountId, name: dto.accountName.trim(), status: 'ACTIVE' },
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
      const platformRole = await tx.role.create({
        data: {
          id: crypto.randomUUID(),
          accountId,
          code: 'PLATFORM_ADMIN',
          name: 'Administrador global',
          description: 'Administra todas las cuentas y tenants disponibles',
          isSystem: true,
        },
      });
      const permissions = await tx.permission.findMany({
        select: { id: true },
      });
      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: platformRole.id,
            permissionId: permission.id,
          })),
        });
      }
      await tx.accountMember.create({
        data: {
          id: crypto.randomUUID(),
          accountId,
          userId,
          roleId: platformRole.id,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });
    });
    return this.findOne(accountId);
  }
}
