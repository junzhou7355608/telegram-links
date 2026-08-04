import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminApiModule } from './api/admin-api.module';
import { HealthController } from './api/health.controller';
import { WebApiModule } from './api/web-api.module';
import { AdminAuthModule } from './auth/admin-auth.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { LinksModule } from './links/links.module';
import { SyncModule } from './sync/sync.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
    PrismaModule,
    AdminAuthModule,
    TelegramModule,
    LinksModule,
    TaxonomyModule,
    SyncModule,
    WebApiModule,
    AdminApiModule,
  ],
})
export class AppModule {}
