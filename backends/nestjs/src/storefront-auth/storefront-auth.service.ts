import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  StorefrontLoginDto,
  StorefrontRegisterDto,
} from './dto/storefront-auth.dto';
import { StorefrontTokenPayload } from './storefront-auth.types';

@Injectable()
export class StorefrontAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: StorefrontRegisterDto) {
    const tenant = await this.resolveTenant(dto.tenantSlug);
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (
      existingUser &&
      (existingUser.status !== 'ACTIVE' ||
        !(await compare(dto.password, existingUser.passwordHash)))
    ) {
      throw new ConflictException(
        'Ya existe una identidad con ese email y no puede vincularse automáticamente.',
      );
    }
    if (existingUser) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: {
          tenantId: tenant.id,
          userId: existingUser.id,
          deletedAt: null,
        },
      });
      if (existingCustomer) {
        throw new ConflictException(
          'Ya existe una cuenta con ese email. Iniciá sesión para continuar.',
        );
      }
    }

    const identity = await this.prisma.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            id: crypto.randomUUID(),
            email,
            passwordHash: await hash(dto.password, 12),
            displayName: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
            status: 'ACTIVE',
            emailVerifiedAt: null,
          },
        }));
      const customer = await tx.customer.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          userId: user.id,
          source: 'STOREFRONT',
          kind: 'INDIVIDUAL',
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          phone: dto.phone?.trim() || null,
          status: 'ACTIVE',
        },
      });
      return { user, customer };
    });
    return this.issueSession(identity.user, identity.customer, tenant);
  }

  async login(dto: StorefrontLoginDto) {
    const tenant = await this.resolveTenant(dto.tenantSlug);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    const customer = await this.prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        userId: user.id,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
    if (!customer) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueSession(user, customer, tenant);
  }

  async sessionFromToken(token?: string) {
    if (!token) throw new UnauthorizedException('Falta la sesión de cliente');
    let payload: StorefrontTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<StorefrontTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Sesión de cliente inválida o vencida');
    }
    if (payload.type !== 'CUSTOMER') {
      throw new UnauthorizedException('Sesión de cliente inválida');
    }
    const [user, customer, tenant] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: payload.userId, status: 'ACTIVE' },
      }),
      this.prisma.customer.findFirst({
        where: {
          id: payload.customerId,
          tenantId: payload.tenantId,
          userId: payload.userId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),
      this.prisma.tenant.findFirst({
        where: {
          id: payload.tenantId,
          status: 'ACTIVE',
          enabled: true,
        },
      }),
    ]);
    if (!user || !customer || !tenant) {
      throw new UnauthorizedException('La sesión de cliente ya no está activa');
    }
    return this.publicSession(user, customer, tenant);
  }

  private async resolveTenant(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: 'ACTIVE', enabled: true },
    });
    if (!tenant) {
      throw new UnauthorizedException('La tienda no está disponible');
    }
    return tenant;
  }

  private async issueSession(
    user: { id: string; email: string; displayName: string },
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      status: string;
    },
    tenant: { id: string; slug: string; name: string },
  ) {
    const payload: StorefrontTokenPayload = {
      type: 'CUSTOMER',
      userId: user.id,
      customerId: customer.id,
      tenantId: tenant.id,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      session: this.publicSession(user, customer, tenant),
    };
  }

  private publicSession(
    user: { id: string; email: string; displayName: string },
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      phone: string | null;
      status: string;
    },
    tenant: { id: string; slug: string; name: string },
  ) {
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
      },
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    };
  }
}
