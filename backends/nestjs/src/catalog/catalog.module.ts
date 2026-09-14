import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import {
  CategoriesController,
  ImagesController,
  ProductsController,
  VariantsController,
} from './catalog.controller';
import { ImagesService } from './images.service';
import { ProductsService } from './products.service';
import { VariantsService } from './variants.service';

@Module({
  controllers: [
    CategoriesController,
    ProductsController,
    VariantsController,
    ImagesController,
  ],
  providers: [
    CategoriesService,
    ProductsService,
    VariantsService,
    ImagesService,
  ],
})
export class CatalogModule {}
