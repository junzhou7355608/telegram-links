import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminApiModule } from './api/admin-api.module';
import { WebApiModule } from './api/web-api.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { LinksModule } from './links/links.module';
import { SyncModule } from './sync/sync.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { TelegramModule } from './telegram/telegram.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
    PrismaModule,
    TelegramModule,
    AiModule,
    LinksModule,
    TaxonomyModule,
    SyncModule,
    WebApiModule,
    AdminApiModule,
  ],
})
export class AppModule {}
