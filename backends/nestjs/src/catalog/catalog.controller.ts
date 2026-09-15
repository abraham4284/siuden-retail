import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { IdParamDto } from '../common/dto/id-param.dto';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateProductImageDto } from './dto/image.dto';
import {
  CreateProductDto,
  CreateVariantDto,
  ProductQueryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './dto/product.dto';
import { ImagesService } from './images.service';
import { ProductsService } from './products.service';
import { VariantsService } from './variants.service';

@ApiBearerAuth()
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Permissions('products.read')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.categories.findAll(user.tenantId);
  }

  @Permissions('products.read')
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.categories.findOne(user.tenantId, params.id);
  }

  @Permissions('categories.write')
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categories.create(user.tenantId, dto);
  }

  @Permissions('categories.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(user.tenantId, params.id, dto);
  }

  @Permissions('categories.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.categories.remove(user.tenantId, params.id);
  }

  @Permissions('categories.write')
  @Post('reorder')
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    items: Array<{ id: string; parentId: string | null; sortOrder: number }>,
  ) {
    for (const item of items)
      await this.categories.update(user.tenantId, item.id, item);
    return this.categories.findAll(user.tenantId);
  }
}

@ApiBearerAuth()
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly variants: VariantsService,
    private readonly images: ImagesService,
  ) {}

  @Permissions('products.read')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProductQueryDto,
  ) {
    return this.products.findAll(user.tenantId, query);
  }

  @Permissions('products.read')
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.products.findOne(user.tenantId, params.id);
  }

  @Permissions('products.write')
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(user.tenantId, dto);
  }

  @Permissions('products.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.tenantId, params.id, dto);
  }

  @Permissions('products.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.products.remove(user.tenantId, params.id);
  }

  @Permissions('products.write')
  @Post(':id/variants')
  createVariant(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: CreateVariantDto,
  ) {
    return this.variants.create(user.tenantId, params.id, dto);
  }

  @Permissions('products.write')
  @Post(':id/images')
  createImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.images.create(user.tenantId, params.id, dto);
  }
}

@ApiBearerAuth()
@ApiTags('product-variants')
@Controller('product-variants')
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}

  @Permissions('products.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.variants.update(user.tenantId, params.id, dto);
  }

  @Permissions('products.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.variants.remove(user.tenantId, params.id);
  }
}

@ApiBearerAuth()
@ApiTags('product-images')
@Controller('product-images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Permissions('products.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.images.remove(user.tenantId, params.id);
  }
}
