import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StorefrontCatalogController } from './storefront-catalog.controller';
import { StoreService } from './store.service';

@Module({
  controllers: [StoreController, StorefrontCatalogController],
  providers: [StoreService],
})
export class StoreModule {}
