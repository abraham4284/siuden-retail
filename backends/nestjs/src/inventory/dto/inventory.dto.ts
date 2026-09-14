import { MovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class StockQueryDto extends PaginationDto {
  @IsOptional() @IsUUID() stockLocationId?: string;
  @IsOptional() @IsUUID() productVariantId?: string;
}

export class MovementQueryDto extends PaginationDto {
  @IsOptional() @IsUUID() stockLocationId?: string;
  @IsOptional() @IsIn(Object.values(MovementType)) movementType?: MovementType;
}

export class CreateMovementItemDto {
  @IsUUID()
  productVariantId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  quantityDelta: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  unitCost?: number;
}

export class CreateStockMovementDto {
  @IsUUID()
  stockLocationId: string;

  @IsIn(['INITIAL', 'MANUAL_IN', 'MANUAL_OUT', 'ADJUSTMENT', 'CUSTOMER_RETURN'])
  movementType: MovementType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMovementItemDto)
  items: CreateMovementItemDto[];
}
