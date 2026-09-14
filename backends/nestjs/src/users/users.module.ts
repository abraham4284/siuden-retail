import { Module } from '@nestjs/common';
import { PlatformAdminsController, UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, PlatformAdminsController],
  providers: [UsersService],
})
export class UsersModule {}
