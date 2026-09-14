import { SetMetadata } from '@nestjs/common';

export const GLOBAL_ADMIN_KEY = 'globalAdmin';
export const GlobalAdmin = () => SetMetadata(GLOBAL_ADMIN_KEY, true);
