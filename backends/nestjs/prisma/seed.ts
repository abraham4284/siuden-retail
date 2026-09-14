import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const IDS = {
  account: '11111111-1111-4111-8111-111111111111',
  tenant: '22222222-2222-4222-8222-222222222222',
  ownerRole: '40000000-0000-4000-8000-000000000001',
  adminRole: '40000000-0000-4000-8000-000000000002',
  sellerRole: '40000000-0000-4000-8000-000000000003',
  stockRole: '40000000-0000-4000-8000-000000000004',
};

const permissionDefinitions = [
  ['store.read', 'Ver configuración de tienda'],
  ['store.update', 'Modificar información de tienda'],
  ['store.theme.update', 'Modificar diseño de tienda'],
  ['products.read', 'Ver productos'],
  ['products.write', 'Crear y modificar productos'],
  ['categories.write', 'Administrar categorías'],
  ['inventory.read', 'Ver stock'],
  ['inventory.adjust', 'Registrar ajustes de stock'],
  ['customers.read', 'Ver clientes'],
  ['customers.write', 'Crear y modificar clientes'],
  ['sales.read', 'Ver ventas'],
  ['sales.create', 'Registrar ventas'],
  ['sales.cancel', 'Anular ventas'],
  ['pos.use', 'Usar el punto de venta'],
  ['orders.manage', 'Administrar pedidos online'],
  ['users.manage', 'Administrar usuarios internos'],
  ['roles.manage', 'Administrar roles y permisos'],
  ['purchases.read', 'Ver compras y proveedores'],
  ['purchases.write', 'Administrar compras y proveedores'],
  ['accounts.manage', 'Administrar todas las cuentas y tenants'],
] as const;

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const displayName =
    process.env.SEED_ADMIN_NAME?.trim() || 'Administrador Rubi';
  const resetAdminPassword = process.env.SEED_ADMIN_RESET_PASSWORD === 'true';
  if (!email || !password || password.length < 12) {
    throw new Error(
      'SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (mínimo 12 caracteres) son obligatorios para el seed',
    );
  }

  await prisma.account.upsert({
    where: { id: IDS.account },
    create: { id: IDS.account, name: 'Rubi Joyeria', status: 'ACTIVE' },
    update: { name: 'Rubi Joyeria', status: 'ACTIVE' },
  });
  await prisma.tenant.upsert({
    where: { id: IDS.tenant },
    create: {
      id: IDS.tenant,
      accountId: IDS.account,
      name: 'Rubi Joyeria',
      slug: 'rubi',
      status: 'ACTIVE',
      defaultCurrency: 'ARS',
      timeZone: 'America/Argentina/Tucuman',
      enabled: true,
    },
    update: { status: 'ACTIVE', enabled: true },
  });

  const roles = [
    [IDS.ownerRole, 'OWNER', 'Propietario'],
    [IDS.adminRole, 'ADMIN', 'Administrador'],
    [IDS.sellerRole, 'SELLER', 'Vendedor'],
    [IDS.stockRole, 'STOCK_MANAGER', 'Responsable de stock'],
  ] as const;
  for (const [id, code, name] of roles) {
    await prisma.role.upsert({
      where: { id },
      create: { id, accountId: IDS.account, code, name, isSystem: true },
      update: { name, isSystem: true },
    });
  }

  const permissions = new Map<string, string>();
  for (const [index, [code, description]] of permissionDefinitions.entries()) {
    const id = `50000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const permission = await prisma.permission.upsert({
      where: { code },
      create: { id, code, description },
      update: { description },
    });
    permissions.set(code, permission.id);
  }
  const rolePermissionCodes: Record<string, string[]> = {
    [IDS.ownerRole]: permissionDefinitions
      .map(([code]) => code)
      .filter((code) => code !== 'accounts.manage'),
    [IDS.adminRole]: permissionDefinitions
      .map(([code]) => code)
      .filter((code) => code !== 'accounts.manage'),
    [IDS.sellerRole]: [
      'products.read',
      'inventory.read',
      'customers.read',
      'customers.write',
      'sales.read',
      'sales.create',
      'pos.use',
    ],
    [IDS.stockRole]: [
      'products.read',
      'products.write',
      'categories.write',
      'inventory.read',
      'inventory.adjust',
      'purchases.read',
      'purchases.write',
    ],
  };
  const accountsManagePermissionId = permissions.get('accounts.manage');
  if (accountsManagePermissionId) {
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: { in: [IDS.ownerRole, IDS.adminRole] },
        permissionId: accountsManagePermissionId,
      },
    });
  }
  for (const [roleId, codes] of Object.entries(rolePermissionCodes)) {
    for (const code of codes) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId: permissions.get(code)! },
        },
        create: { roleId, permissionId: permissions.get(code)! },
        update: {},
      });
    }
  }

  const globalAdminPermissionIds = [...permissions.values()];
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  const globalAdmin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          displayName,
          status: 'ACTIVE',
          ...(resetAdminPassword ? { passwordHash: await hash(password, 12) } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          passwordHash: await hash(password, 12),
          displayName,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

  // A platform admin is represented without changing the already-applied SQL:
  // each account gets a system role and the user is a member of every account.
  // Login still requires a concrete tenantId when the user needs to switch stores.
  const existingAccounts = await prisma.account.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { id: true },
  });
  for (const account of existingAccounts) {
    const platformRole = await prisma.role.upsert({
      where: {
        accountId_code: { accountId: account.id, code: 'PLATFORM_ADMIN' },
      },
      create: {
        id: crypto.randomUUID(),
        accountId: account.id,
        code: 'PLATFORM_ADMIN',
        name: 'Administrador global',
        description: 'Administra todas las cuentas y tenants disponibles',
        isSystem: true,
      },
      update: {
        name: 'Administrador global',
        description: 'Administra todas las cuentas y tenants disponibles',
        isSystem: true,
      },
    });
    for (const permissionId of globalAdminPermissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: platformRole.id, permissionId },
        },
        create: { roleId: platformRole.id, permissionId },
        update: {},
      });
    }
    await prisma.accountMember.upsert({
      where: {
        accountId_userId: { accountId: account.id, userId: globalAdmin.id },
      },
      create: {
        id: crypto.randomUUID(),
        accountId: account.id,
        userId: globalAdmin.id,
        roleId: platformRole.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
      update: {
        roleId: platformRole.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });
  }

  await prisma.storefrontSetting.upsert({
    where: { tenantId: IDS.tenant },
    create: {
      id: '70000000-0000-4000-8000-000000000002',
      tenantId: IDS.tenant,
    },
    update: {},
  });
  await prisma.stockLocation.upsert({
    where: { tenantId_code: { tenantId: IDS.tenant, code: 'MAIN' } },
    create: {
      id: '90000000-0000-4000-8000-000000000001',
      tenantId: IDS.tenant,
      name: 'Local principal',
      code: 'MAIN',
      isDefault: true,
      addressLine: 'Mendoza',
      addressNumber: '803',
      city: 'San Miguel de Tucuman',
      province: 'Tucuman',
    },
    update: { enabled: true, isDefault: true },
  });
  const sequences = [
    ['91000000-0000-4000-8000-000000000001', 'SALE', 'V-', 6],
    ['91000000-0000-4000-8000-000000000002', 'ORDER', 'P-', 6],
    ['91000000-0000-4000-8000-000000000003', 'PURCHASE', 'C-', 6],
    ['91000000-0000-4000-8000-000000000004', 'STOCK_MOVEMENT', 'M-', 8],
  ] as const;
  for (const [id, documentType, prefix, padding] of sequences) {
    await prisma.documentSequence.upsert({
      where: { tenantId_documentType: { tenantId: IDS.tenant, documentType } },
      create: { id, tenantId: IDS.tenant, documentType, prefix, padding },
      update: { prefix, padding },
    });
  }
  for (const [id, code, name] of [
    ['92000000-0000-4000-8000-000000000001', 'RETAIL', 'Minorista'],
    ['92000000-0000-4000-8000-000000000002', 'WHOLESALE', 'Mayorista'],
  ] as const) {
    await prisma.customerGroup.upsert({
      where: { tenantId_code: { tenantId: IDS.tenant, code } },
      create: { id, tenantId: IDS.tenant, code, name },
      update: { name, enabled: true },
    });
  }

  console.info(
    `Seed completado. Administrador global: ${globalAdmin.email}; cuentas: ${existingAccounts.length}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
