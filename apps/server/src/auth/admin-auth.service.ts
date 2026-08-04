import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import {
  createHash,
  createHmac,
  timingSafeEqual,
  type BinaryLike,
} from 'node:crypto';
import type { CookieOptions } from 'express';
import {
  ADMIN_LOGIN_FAILURE_LIMIT,
  ADMIN_LOGIN_FAILURE_WINDOW_MS,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_DURATION_SECONDS,
} from './admin-auth.constants';

interface AdminSessionPayload {
  credentialTag: string;
  expiresAt: number;
  version: 1;
}

interface FailedLoginBucket {
  count: number;
  startedAt: number;
}

interface LoginResult {
  token: string;
  username: string;
}

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/u;

function hash(value: BinaryLike): Buffer {
  return createHash('sha256').update(value).digest();
}

function safeStringEqual(left: string, right: string): boolean {
  return timingSafeEqual(hash(left), hash(right));
}

function decodeBase64Key(value: string): Buffer | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const decoded = Buffer.from(normalized, 'base64');
  const canonical = decoded.toString('base64').replace(/=+$/u, '');
  return decoded.length === 32 && canonical === normalized.replace(/=+$/u, '')
    ? decoded
    : null;
}

@Injectable()
export class AdminAuthService {
  private readonly failedLogins = new Map<string, FailedLoginBucket>();
  private readonly passwordHash: string;
  private readonly sessionKey: Buffer | null;
  private readonly username: string;
  private readonly secureCookie: boolean;

  constructor(config: ConfigService) {
    this.username = config.get<string>('BASIC_AUTH_USERNAME')?.trim() ?? '';
    this.passwordHash =
      config.get<string>('BASIC_AUTH_PASSWORD_HASH')?.trim() ?? '';
    this.sessionKey = decodeBase64Key(
      config.get<string>('ADMIN_AUTH_SESSION_SECRET') ?? '',
    );
    this.secureCookie = config.get<string>('NODE_ENV') === 'production';
  }

  async login(
    clientId: string,
    username: string,
    password: string,
  ): Promise<LoginResult> {
    this.requireConfigured();
    const now = Date.now();
    this.requireLoginAllowed(clientId, now);

    const usernameMatches = safeStringEqual(username.trim(), this.username);
    const passwordMatches = await compare(password, this.passwordHash);
    if (!usernameMatches || !passwordMatches) {
      this.recordFailedLogin(clientId, now);
      throw new UnauthorizedException({
        code: 'INVALID_ADMIN_CREDENTIALS',
        message: '用户名或密码不正确。',
      });
    }

    this.failedLogins.delete(clientId);
    return {
      token: this.createSessionToken(now),
      username: this.username,
    };
  }

  getSession(cookieHeader: string | undefined): {
    authenticated: boolean;
    username?: string;
  } {
    const token = this.readCookie(cookieHeader);
    if (!token || !this.isSessionTokenValid(token)) {
      return { authenticated: false };
    }
    return { authenticated: true, username: this.username };
  }

  isAuthenticated(cookieHeader: string | undefined): boolean {
    return this.getSession(cookieHeader).authenticated;
  }

  requireConfigured(): void {
    if (
      !this.username ||
      !BCRYPT_HASH_PATTERN.test(this.passwordHash) ||
      !this.sessionKey
    ) {
      throw new ServiceUnavailableException({
        code: 'ADMIN_AUTH_NOT_CONFIGURED',
        message: '管理端登录尚未完成配置。',
      });
    }
  }

  sessionCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      maxAge: ADMIN_SESSION_DURATION_SECONDS * 1000,
      path: '/api/admin/v1',
      sameSite: 'strict',
      secure: this.secureCookie,
    };
  }

  clearCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      path: '/api/admin/v1',
      sameSite: 'strict',
      secure: this.secureCookie,
    };
  }

  private createSessionToken(now: number): string {
    const payload: AdminSessionPayload = {
      credentialTag: this.credentialTag(),
      expiresAt: Math.floor(now / 1000) + ADMIN_SESSION_DURATION_SECONDS,
      version: 1,
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encoded}.${this.sign(encoded)}`;
  }

  private isSessionTokenValid(token: string): boolean {
    if (!this.sessionKey) {
      return false;
    }
    const [encoded, signature, extra] = token.split('.');
    if (!encoded || !signature || extra) {
      return false;
    }

    const expectedSignature = Buffer.from(this.sign(encoded), 'base64url');
    const receivedSignature = Buffer.from(signature, 'base64url');
    if (
      expectedSignature.length !== receivedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      return false;
    }

    try {
      const value: unknown = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      );
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      const payload = value as Partial<AdminSessionPayload>;
      return (
        payload.version === 1 &&
        Number.isSafeInteger(payload.expiresAt) &&
        (payload.expiresAt ?? 0) > Math.floor(Date.now() / 1000) &&
        typeof payload.credentialTag === 'string' &&
        safeStringEqual(payload.credentialTag, this.credentialTag())
      );
    } catch {
      return false;
    }
  }

  private credentialTag(): string {
    return hash(`${this.username}\0${this.passwordHash}`).toString('base64url');
  }

  private sign(value: string): string {
    if (!this.sessionKey) {
      return '';
    }
    return createHmac('sha256', this.sessionKey)
      .update(value)
      .digest('base64url');
  }

  private readCookie(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) {
      return null;
    }
    for (const part of cookieHeader.split(';')) {
      const separator = part.indexOf('=');
      if (separator === -1) {
        continue;
      }
      const name = part.slice(0, separator).trim();
      if (name !== ADMIN_SESSION_COOKIE_NAME) {
        continue;
      }
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
    return null;
  }

  private requireLoginAllowed(clientId: string, now: number): void {
    const bucket = this.failedLogins.get(clientId);
    if (!bucket) {
      return;
    }
    if (now - bucket.startedAt >= ADMIN_LOGIN_FAILURE_WINDOW_MS) {
      this.failedLogins.delete(clientId);
      return;
    }
    if (bucket.count >= ADMIN_LOGIN_FAILURE_LIMIT) {
      throw new HttpException(
        {
          code: 'ADMIN_AUTH_RATE_LIMITED',
          message: '登录尝试过多，请稍后再试。',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedLogin(clientId: string, now: number): void {
    const current = this.failedLogins.get(clientId);
    if (!current || now - current.startedAt >= ADMIN_LOGIN_FAILURE_WINDOW_MS) {
      this.failedLogins.set(clientId, { count: 1, startedAt: now });
      return;
    }
    current.count += 1;
  }
}
