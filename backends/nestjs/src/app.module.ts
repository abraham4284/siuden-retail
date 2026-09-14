import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { GlobalAdminGuard } from './auth/guards/global-admin.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { CatalogModule } from './catalog/catalog.module';
import { CustomersModule } from './customers/customers.module';
import { HealthController } from './health.controller';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { StorefrontAuthModule } from './storefront-auth/storefront-auth.module';
import { UsersModule } from './users/users.module';

function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_FRONTEND_URL']) {
    if (typeof config[key] !== 'string' || config[key].length === 0) {
      throw new Error(`La variable de entorno ${key} es obligatoria`);
    }
  }
  if ((config.JWT_SECRET as string).length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    AccountsModule,
    CatalogModule,
    CustomersModule,
    InventoryModule,
    SalesModule,
    PurchasesModule,
    UsersModule,
    StorefrontAuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: GlobalAdminGuard },
  ],
})
export class AppModule {}
