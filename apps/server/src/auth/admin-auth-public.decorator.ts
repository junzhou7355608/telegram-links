import { SetMetadata } from '@nestjs/common';
import { ADMIN_AUTH_PUBLIC_KEY } from './admin-auth.constants';

export const PublicAdminAuth = () => SetMetadata(ADMIN_AUTH_PUBLIC_KEY, true);
