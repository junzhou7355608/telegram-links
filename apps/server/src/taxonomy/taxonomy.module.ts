import { Global, Module } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';

@Global()
@Module({
  exports: [TaxonomyService],
  providers: [TaxonomyService],
})
export class TaxonomyModule {}
