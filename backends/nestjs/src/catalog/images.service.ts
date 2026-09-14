import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductImageDto } from './dto/image.dto';

@Injectable()
export class ImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    productId: string,
    dto: CreateProductImageDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (dto.productVariantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: {
          id: dto.productVariantId,
          tenantId,
          productId,
          deletedAt: null,
        },
      });
      if (!variant)
        throw new NotFoundException('Variante no encontrada en el producto');
    }
    const imageId = crypto.randomUUID();
    const assetId = crypto.randomUUID();
    await this.prisma.$transaction(async (tx) => {
      const { productVariantId, sortOrder, isPrimary, ...asset } = dto;
      await tx.mediaAsset.create({
        data: {
          id: assetId,
          tenantId,
          ...asset,
          sizeBytes: BigInt(dto.sizeBytes),
        },
      });
      if (isPrimary)
        await tx.productImage.updateMany({
          where: { tenantId, productId },
          data: { isPrimary: false },
        });
      await tx.productImage.create({
        data: {
          id: imageId,
          tenantId,
          productId,
          productVariantId,
          sortOrder,
          isPrimary,
          mediaAssetId: assetId,
        },
      });
    });
    return this.prisma.productImage.findUnique({ where: { id: imageId } });
  }

  async remove(tenantId: string, id: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id, tenantId },
    });
    if (!image) throw new NotFoundException('Imagen no encontrada');
    await this.prisma.$transaction([
      this.prisma.productImage.delete({ where: { id } }),
      this.prisma.mediaAsset.update({
        where: { id: image.mediaAssetId },
        data: { status: 'DELETED', deletedAt: new Date() },
      }),
    ]);
    return { id, deleted: true };
  }
}
