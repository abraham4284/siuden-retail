import { PartialType } from '@nestjs/swagger';
import { ProductStatus, SellingMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateVariantDto {
  @IsOptional()
  @IsUUID()
  id?: string;
  @IsString()
  @MaxLength(180)
  name = 'Default';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBackorder?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional() @IsNumber() @Min(0) weightKg?: number;
  @IsOptional() @IsNumber() @Min(0) heightCm?: number;
  @IsOptional() @IsNumber() @Min(0) widthCm?: number;
  @IsOptional() @IsNumber() @Min(0) depthCm?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  selectedOptionValueIds?: string[];
}

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}

export class ProductOptionValueDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MaxLength(100) value: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class ProductOptionDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @MaxLength(100) name: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionValueDto)
  values: ProductOptionValueDto[];
}

export class CreateProductDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsEnum(SellingMode)
  sellingMode?: SellingMode;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options?: ProductOptionDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
