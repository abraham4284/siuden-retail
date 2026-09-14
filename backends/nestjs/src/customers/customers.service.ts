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
    return paginated(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    this.assertName(dto);
    await this.assertGroup(tenantId, dto.customerGroupId);
    return this.prisma.customer.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        ...dto,
        email: dto.email?.trim().toLowerCase(),
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const current = await this.findOne(tenantId, id);
    this.assertName({ ...current, ...dto });
    await this.assertGroup(tenantId, dto.customerGroupId);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email?.trim().toLowerCase(),
        blockedAt:
          dto.status === 'BLOCKED' ? new Date() : dto.status ? null : undefined,
      },
    });
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
}
