import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { StoreService } from './store.service';

@Public()
@ApiTags('storefront')
@Controller('storefront/catalog')
export class StorefrontCatalogController {
  constructor(private readonly store: StoreService) {}

  @Get(':slug')
  catalog(@Param('slug') slug: string) {
    return this.store.publicCatalog(slug);
  }
}
