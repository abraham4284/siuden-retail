import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto, UpdateVariantDto } from './dto/product.dto';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return this.prisma.productVariant.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        productId,
        ...dto,
        name: dto.name.trim(),
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateVariantDto) {
    await this.findOne(tenantId, id);
    return this.prisma.productVariant.update({
      where: { id },
      data: { ...dto, name: dto.name?.trim() },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.productVariant.update({
      where: { id },
      data: { deletedAt: new Date(), enabled: false },
    });
  }

  private async findOne(tenantId: string, id: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');
    return variant;
  }
}
