import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ADMIN_AUTH_PUBLIC_KEY } from './admin-auth.constants';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.originalUrl.split('?')[0];
    const isAdminApi =
      path === '/api/admin/v1' || path.startsWith('/api/admin/v1/');
    if (!isAdminApi) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      ADMIN_AUTH_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    this.auth.requireConfigured();
    if (!this.auth.isAuthenticated(request.headers.cookie)) {
      throw new UnauthorizedException({
        code: 'ADMIN_AUTH_REQUIRED',
        message: '请先登录管理端。',
      });
    }
    return true;
  }
}
