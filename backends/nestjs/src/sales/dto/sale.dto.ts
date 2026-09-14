import { SaleChannel, SaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateSaleItemDto {
  @IsUUID()
  productVariantId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;
}

export class CreateSaleDto {
  @IsOptional() @IsUUID() customerId?: string;
  @IsUUID() stockLocationId: string;
  @IsOptional() @IsEnum(SaleChannel) channel?: SaleChannel;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}

export class SaleQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(SaleStatus) status?: SaleStatus;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() stockLocationId?: string;
}

export class CancelSaleDto {
  @IsString()
  @MaxLength(255)
  reason: string;
}
