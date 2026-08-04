import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminAuthController } from '../api/admin-auth.controller';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';

@Module({
  controllers: [AdminAuthController],
  exports: [AdminAuthService],
  providers: [
    AdminAuthService,
    { provide: APP_GUARD, useClass: AdminAuthGuard },
  ],
})
export class AdminAuthModule {}
