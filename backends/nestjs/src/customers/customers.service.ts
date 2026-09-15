import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, paginationArgs } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: CustomerQueryDto) {
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      deletedAt: null,
      status: query.status,
      kind: query.kind,
      source: query.source,
      customerGroupId: query.customerGroupId,
      OR: query.search
        ? [
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
            { businessName: { contains: query.search } },
            { email: { contains: query.search } },
            { phone: { contains: query.search } },
            { documentNumber: { contains: query.search } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginated(await this.views(tenantId, data), total, query);
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return (await this.views(tenantId, [customer]))[0];
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    this.assertName(dto);
    await this.assertGroup(tenantId, dto.customerGroupId);
    const { addresses, ...data } = dto;
    const customer = await this.prisma.customer.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        ...data,
        email: dto.email?.trim().toLowerCase(),
      },
    });
    if (addresses?.length)
      await this.prisma.customerAddress.createMany({
        data: addresses.map(({ id, ...address }) => ({
          id: id ?? crypto.randomUUID(),
          tenantId,
          customerId: customer.id,
          ...address,
        })),
      });
    return this.findOne(tenantId, customer.id);
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const current = await this.findOne(tenantId, id);
    this.assertName({ ...current, ...dto });
    await this.assertGroup(tenantId, dto.customerGroupId);
    const { addresses, ...data } = dto;
    await this.prisma.customer.update({
      where: { id },
      data: {
        ...data,
        email: dto.email?.trim().toLowerCase(),
        blockedAt:
          dto.status === 'BLOCKED' ? new Date() : dto.status ? null : undefined,
      },
    });
    if (addresses) {
      await this.prisma.$transaction(async (tx) => {
        await tx.customerAddress.deleteMany({
          where: { tenantId, customerId: id },
        });
        if (addresses.length)
          await tx.customerAddress.createMany({
            data: addresses.map(({ id: addressId, ...address }) => ({
              id: addressId ?? crypto.randomUUID(),
              tenantId,
              customerId: id,
              ...address,
            })),
          });
      });
    }
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  private assertName(value: {
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
  }): void {
    if (!value.firstName && !value.lastName && !value.businessName) {
      throw new BadRequestException(
        'El cliente debe tener nombre, apellido o razón social',
      );
    }
  }

  private async assertGroup(tenantId: string, groupId?: string): Promise<void> {
    if (!groupId) return;
    const group = await this.prisma.customerGroup.findFirst({
      where: { id: groupId, tenantId, enabled: true },
    });
    if (!group) throw new NotFoundException('Grupo de clientes no encontrado');
  }

  private async views(
    tenantId: string,
    customers: Array<{ id: string } & Record<string, unknown>>,
  ) {
    const ids = customers.map((customer) => customer.id);
    const [addresses, saleStats] = await Promise.all([
      this.prisma.customerAddress.findMany({
        where: { tenantId, customerId: { in: ids } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { tenantId, customerId: { in: ids }, status: 'CONFIRMED' },
        _count: { id: true },
        _sum: { total: true },
      }),
    ]);
    return customers.map((customer) => {
      const stats = saleStats.find((item) => item.customerId === customer.id);
      return {
        ...customer,
        addresses: addresses.filter(
          (address) => address.customerId === customer.id,
        ),
        salesCount: stats?._count.id ?? 0,
        totalSpent: stats?._sum.total ?? 0,
      };
    });
  }
}
