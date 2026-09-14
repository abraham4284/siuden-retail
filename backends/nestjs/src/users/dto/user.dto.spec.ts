import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccountRoleCode, CreateUserDto } from './user.dto';

describe('CreateUserDto', () => {
  it('acepta un usuario administrativo válido', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'seller@example.com',
      password: 'clave-segura-123',
      displayName: 'Vendedor',
      roleCode: AccountRoleCode.SELLER,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rechaza PLATFORM_ADMIN y contraseñas cortas en el alta común', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'admin@example.com',
      password: 'corta',
      displayName: 'Admin',
      roleCode: 'PLATFORM_ADMIN',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['password', 'roleCode']),
    );
  });
});
