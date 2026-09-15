import { PartialType } from '@nestjs/swagger';
import { StoreContactChannelType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateStoreProfileDto {
  @IsString() @MaxLength(150) brandName: string;
  @IsOptional() @IsEmail() contactEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(200) addressLine?: string | null;
  @IsOptional() @IsString() @MaxLength(30) addressNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsString() @MaxLength(100) province?: string | null;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string | null;
  @IsString() @Length(2, 2) countryCode: string;
}

export class UpdateStorefrontSettingsDto {
  @IsBoolean() isPublished: boolean;
  @IsBoolean() contactFormEnabled: boolean;
  @IsBoolean() showPrices: boolean;
  @IsBoolean() allowNegativeStock: boolean;
  @IsString() defaultCatalogSort: string;
  @IsInt() @Min(1) @Max(6) catalogColumnsDesktop: number;
}

export class UpdateStoreThemeDto {
  @IsOptional() @IsUUID() logoAssetId?: string | null;
  @IsOptional() @IsUUID() faviconAssetId?: string | null;
  @IsHexColor() primaryColor: string;
  @IsHexColor() secondaryColor: string;
  @IsHexColor() backgroundColor: string;
  @IsHexColor() textColor: string;
  @IsString() @MaxLength(100) headingFont: string;
  @IsString() @MaxLength(100) bodyFont: string;
  @IsString() @MaxLength(30) borderRadius: string;
  @IsBoolean() announcementEnabled: boolean;
  @IsOptional() @IsString() @MaxLength(255) announcementText?: string | null;
  @IsOptional() @IsUrl() @MaxLength(500) announcementUrl?: string | null;
}

export class StoreContactChannelDto {
  @IsOptional() @IsUUID() id?: string;
  @IsEnum(StoreContactChannelType) channelType: StoreContactChannelType;
  @IsOptional() @IsString() @MaxLength(255) value?: string | null;
  @IsOptional() @IsUrl() @MaxLength(500) url?: string | null;
  @IsBoolean() enabled: boolean;
  @IsInt() @Min(0) sortOrder: number;
}

export class UpdateStoreContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreContactChannelDto)
  items: StoreContactChannelDto[];
}

export class PatchStoreProfileDto extends PartialType(UpdateStoreProfileDto) {}
