import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto);
    response.cookie('siuden_admin_access_token', result.accessToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return result;
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.session(user);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('siuden_admin_access_token', {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Sesión cerrada' };
  }
}
