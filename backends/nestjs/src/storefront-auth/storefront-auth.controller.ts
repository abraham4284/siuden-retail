import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { readCookie } from '../common/utils/cookies';
import {
  StorefrontLoginDto,
  StorefrontRegisterDto,
} from './dto/storefront-auth.dto';
import { StorefrontAuthService } from './storefront-auth.service';

const COOKIE_NAME = 'siuden_storefront_access_token';

@ApiTags('storefront-auth')
@Public()
@Controller('storefront/auth')
export class StorefrontAuthController {
  constructor(
    private readonly auth: StorefrontAuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: StorefrontRegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setCookie(response, result.accessToken);
    return { session: result.session };
  }

  @Post('login')
  async login(
    @Body() dto: StorefrontLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setCookie(response, result.accessToken);
    return { session: result.session };
  }

  @Get('me')
  me(@Req() request: Request) {
    return this.auth.sessionFromToken(
      readCookie(request.headers.cookie, COOKIE_NAME),
    );
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_NAME, this.cookieOptions());
    return { message: 'Sesión cerrada' };
  }

  private setCookie(response: Response, token: string): void {
    response.cookie(COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge: 8 * 60 * 60 * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
