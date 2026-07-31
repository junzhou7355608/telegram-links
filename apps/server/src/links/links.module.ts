import { Global, Module } from '@nestjs/common';
import { LinksService } from './links.service';

@Global()
@Module({
  exports: [LinksService],
  providers: [LinksService],
})
export class LinksModule {}
