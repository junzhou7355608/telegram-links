import { Module } from '@nestjs/common';
import { AdminLinksController } from './admin-links.controller';
import { AdminSyncController } from './admin-sync.controller';
import { AdminTaxonomyController } from './admin-taxonomy.controller';
import { AdminTelegramController } from './admin-telegram.controller';
import { AdminAiController } from './admin-ai.controller';

@Module({
  controllers: [
    AdminAiController,
    AdminLinksController,
    AdminSyncController,
    AdminTaxonomyController,
    AdminTelegramController,
  ],
})
export class AdminApiModule {}
