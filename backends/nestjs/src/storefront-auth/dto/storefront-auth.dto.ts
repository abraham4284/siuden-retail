import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class StorefrontLoginDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  tenantSlug: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class StorefrontRegisterDto extends StorefrontLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
