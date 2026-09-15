import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateStoreContactsDto,
  UpdateStoreProfileDto,
  UpdateStorefrontSettingsDto,
  UpdateStoreThemeDto,
} from './dto/store.dto';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(tenantId: string) {
    const profile = await this.prisma.storeProfile.findUnique({
      where: { tenantId },
    });
    if (!profile) throw new NotFoundException('Perfil de tienda no encontrado');
    return profile;
  }

  async updateProfile(tenantId: string, dto: UpdateStoreProfileDto) {
    return this.prisma.storeProfile.upsert({
      where: { tenantId },
      create: { id: crypto.randomUUID(), tenantId, ...dto },
      update: dto,
    });
  }

  async settings(tenantId: string) {
    const value = await this.prisma.storefrontSetting.findUnique({
      where: { tenantId },
    });
    if (!value)
      throw new NotFoundException('Configuración de tienda no encontrada');
    return { ...value, catalogColumnsDesktop: value.catalogColumns };
  }

  async updateSettings(tenantId: string, dto: UpdateStorefrontSettingsDto) {
    const { catalogColumnsDesktop, ...data } = dto;
    const value = await this.prisma.storefrontSetting.upsert({
      where: { tenantId },
      create: {
        id: crypto.randomUUID(),
        tenantId,
        ...data,
        catalogColumns: catalogColumnsDesktop,
      },
      update: { ...data, catalogColumns: catalogColumnsDesktop },
    });
    return { ...value, catalogColumnsDesktop: value.catalogColumns };
  }

  async theme(tenantId: string) {
    const value = await this.prisma.storeTheme.findUnique({
      where: { tenantId },
    });
    if (!value) throw new NotFoundException('Tema de tienda no encontrado');
    return this.themeView(tenantId, value);
  }

  async updateTheme(tenantId: string, dto: UpdateStoreThemeDto) {
    const value = await this.prisma.storeTheme.upsert({
      where: { tenantId },
      create: { id: crypto.randomUUID(), tenantId, ...dto },
      update: dto,
    });
    return this.themeView(tenantId, value);
  }

  contacts(tenantId: string) {
    return this.prisma.storeContactChannel.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateContacts(tenantId: string, dto: UpdateStoreContactsDto) {
    const types = dto.items.map((item) => item.channelType);
    if (new Set(types).size !== types.length) {
      throw new BadRequestException('No se puede repetir un tipo de canal');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.storeContactChannel.deleteMany({
        where: { tenantId, channelType: { notIn: types } },
      });
      for (const item of dto.items) {
        const { id, ...data } = item;
        await tx.storeContactChannel.upsert({
          where: {
            tenantId_channelType: { tenantId, channelType: item.channelType },
          },
          create: { id: id ?? crypto.randomUUID(), tenantId, ...data },
          update: data,
        });
      }
    });
    return this.contacts(tenantId);
  }

  async publicCatalog(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: 'ACTIVE', enabled: true },
    });
    if (!tenant) throw new NotFoundException('Tienda no encontrada');
    const [profile, settings, theme, contacts, categories, products] =
      await Promise.all([
        this.prisma.storeProfile.findUnique({ where: { tenantId: tenant.id } }),
        this.prisma.storefrontSetting.findUnique({
          where: { tenantId: tenant.id },
        }),
        this.prisma.storeTheme.findUnique({ where: { tenantId: tenant.id } }),
        this.contacts(tenant.id),
        this.prisma.category.findMany({
          where: { tenantId: tenant.id, isVisible: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.product.findMany({
          where: { tenantId: tenant.id, status: 'PUBLISHED', deletedAt: null },
          orderBy: { publishedAt: 'desc' },
        }),
      ]);
    if (!settings?.isPublished)
      throw new NotFoundException('La tienda no está publicada');
    const variants = await this.prisma.productVariant.findMany({
      where: {
        tenantId: tenant.id,
        productId: { in: products.map((item) => item.id) },
        enabled: true,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });
    const [balances, assignments, links] = await Promise.all([
      this.prisma.inventoryBalance.findMany({
        where: {
          tenantId: tenant.id,
          productVariantId: { in: variants.map((item) => item.id) },
        },
      }),
      this.prisma.productCategory.findMany({
        where: {
          tenantId: tenant.id,
          productId: { in: products.map((item) => item.id) },
        },
      }),
      this.prisma.productImage.findMany({
        where: {
          tenantId: tenant.id,
          productId: { in: products.map((item) => item.id) },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        tenantId: tenant.id,
        id: { in: links.map((item) => item.mediaAssetId) },
        status: 'ACTIVE',
      },
    });
    return {
      tenant: {
        ...tenant,
        profile,
        settings: {
          ...settings,
          catalogColumnsDesktop: settings.catalogColumns,
        },
        theme: theme ? await this.themeView(tenant.id, theme) : null,
        contacts,
      },
      categories,
      products: products.map((product, index) => {
        const productVariants = variants.filter(
          (variant) => variant.productId === product.id,
        );
        const categoryLinks = assignments.filter(
          (item) => item.productId === product.id,
        );
        return {
          ...product,
          primaryCategoryId:
            categoryLinks.find((item) => item.isPrimary)?.categoryId ?? null,
          categoryIds: categoryLinks.map((item) => item.categoryId),
          featured: index < 4,
          isNew: Boolean(
            product.publishedAt &&
            Date.now() - product.publishedAt.getTime() < 30 * 86400000,
          ),
          imageUrls: links
            .filter((link) => link.productId === product.id)
            .map((link) =>
              assets.find((asset) => asset.id === link.mediaAssetId),
            )
            .filter((asset) => asset !== undefined)
            .map((asset) => `/${asset.storageKey.replace(/^\/+/, '')}`),
          variants: productVariants.map((variant) => {
            const productBalances = balances.filter(
              (balance) => balance.productVariantId === variant.id,
            );
            const available = productBalances.reduce(
              (sum, balance) =>
                sum + Number(balance.onHand.sub(balance.reserved)),
              0,
            );
            return { ...variant, available };
          }),
        };
      }),
    };
  }

  private async themeView(
    tenantId: string,
    value: {
      logoAssetId: string | null;
      faviconAssetId: string | null;
    } & Record<string, unknown>,
  ) {
    const ids = [value.logoAssetId, value.faviconAssetId].filter(
      (id): id is string => Boolean(id),
    );
    const assets = ids.length
      ? await this.prisma.mediaAsset.findMany({
          where: { tenantId, id: { in: ids }, status: 'ACTIVE' },
        })
      : [];
    const url = (id: string | null) => {
      const asset = assets.find((item) => item.id === id);
      return asset ? `/${asset.storageKey.replace(/^\/+/, '')}` : null;
    };
    return {
      ...value,
      logoUrl: url(value.logoAssetId),
      faviconUrl: url(value.faviconAssetId),
    };
  }
}
