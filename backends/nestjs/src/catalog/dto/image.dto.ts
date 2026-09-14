import {
  IsBoolean,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductImageDto {
  @IsString()
  @MaxLength(500)
  storageKey: string;

  @IsString()
  @MaxLength(255)
  originalName: string;

  @IsMimeType()
  mimeType: string;

  @IsInt()
  @Min(0)
  sizeBytes: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
