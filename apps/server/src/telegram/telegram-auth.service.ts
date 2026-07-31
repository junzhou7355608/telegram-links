import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { SessionCryptoService } from './session-crypto.service';
import { type TelegramUserProfile, TelegramGateway } from './telegram.gateway';

const ACCOUNT_ID = 'default';
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

interface LoginChallenge {
  expiresAt: Date;
  id: string;
  isCodeViaApp: boolean;
  phoneCodeHash: string;
  phoneNumber: string;
  stage: 'code' | 'password';
}

function telegramErrorCode(error: unknown): string {
  const value = error as { errorMessage?: string; message?: string };
  return value.errorMessage ?? value.message ?? 'TELEGRAM_REQUEST_FAILED';
}

@Injectable()
export class TelegramAuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramAuthService.name);
  private challenge: LoginChallenge | null = null;
  private authorized = false;

  constructor(
    private readonly gateway: TelegramGateway,
    private readonly prisma: PrismaService,
    private readonly sessionCrypto: SessionCryptoService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.gateway.isConfigured()) {
      return;
    }
    const account = await this.prisma.telegramAccount.findUnique({
      where: { id: ACCOUNT_ID },
    });
    if (
      !account?.sessionCiphertext ||
      !account.sessionIv ||
      !account.sessionAuthTag
    ) {
      return;
    }

    try {
      const session = this.sessionCrypto.decrypt({
        authTag: account.sessionAuthTag,
        ciphertext: account.sessionCiphertext,
        iv: account.sessionIv,
      });
      this.authorized = await this.gateway.connectWithSession(session);
      if (this.authorized) {
        await this.persistAuthorizedUser(await this.gateway.getCurrentUser());
      }
    } catch (error) {
      this.logger.warn(`无法恢复 Telegram 会话：${telegramErrorCode(error)}`);
      this.authorized = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.gateway.disconnect();
  }

  async getAccountStatus() {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { id: ACCOUNT_ID },
    });
    return {
      configured: this.gateway.isConfigured(),
      status: this.authorized ? 'authorized' : 'unauthorized',
      account:
        this.authorized && account
          ? {
              displayName: account.displayName,
              phoneNumber: this.maskPhone(account.phoneNumber),
              telegramUserId: account.telegramUserId,
              username: account.username,
            }
          : null,
    };
  }

  async sendCode(phoneNumber: string) {
    this.ensureConfigured();
    try {
      await this.gateway.resetSession();
      const result = await this.gateway.sendCode(phoneNumber);
      const challenge: LoginChallenge = {
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
        id: randomUUID(),
        isCodeViaApp: result.isCodeViaApp,
        phoneCodeHash: result.phoneCodeHash,
        phoneNumber,
        stage: 'code',
      };
      this.challenge = challenge;
      return {
        challengeId: challenge.id,
        delivery: challenge.isCodeViaApp ? 'app' : 'sms',
        expiresAt: challenge.expiresAt.toISOString(),
      };
    } catch (error) {
      throw this.mapTelegramError(error);
    }
  }

  async verifyCode(challengeId: string, code: string) {
    const challenge = this.requireChallenge(challengeId, 'code');
    try {
      const result = await this.gateway.signInWithCode(
        challenge.phoneNumber,
        challenge.phoneCodeHash,
        code,
      );
      if (result.status === 'passwordRequired') {
        challenge.stage = 'password';
        return { status: 'passwordRequired' as const };
      }
      await this.persistAuthorizedUser(result.user);
      this.challenge = null;
      return { status: 'authorized' as const };
    } catch (error) {
      throw this.mapTelegramError(error);
    }
  }

  async verifyPassword(challengeId: string, password: string) {
    this.requireChallenge(challengeId, 'password');
    try {
      await this.persistAuthorizedUser(
        await this.gateway.signInWithPassword(password),
      );
      this.challenge = null;
      return { status: 'authorized' as const };
    } catch (error) {
      throw this.mapTelegramError(error);
    }
  }

  async logOut(): Promise<void> {
    try {
      await this.gateway.logOut();
    } catch (error) {
      this.logger.warn(`Telegram 远端注销失败：${telegramErrorCode(error)}`);
      await this.gateway.disconnect();
    } finally {
      this.authorized = false;
      this.challenge = null;
      await this.prisma.telegramAccount.upsert({
        create: { id: ACCOUNT_ID },
        update: {
          authorizedAt: null,
          displayName: null,
          phoneNumber: null,
          sessionAuthTag: null,
          sessionCiphertext: null,
          sessionIv: null,
          telegramUserId: null,
          username: null,
        },
        where: { id: ACCOUNT_ID },
      });
    }
  }

  requireAuthorized(): void {
    if (!this.authorized) {
      throw new UnauthorizedException({
        code: 'TELEGRAM_NOT_AUTHORIZED',
        message: 'Telegram 账号尚未授权。',
      });
    }
  }

  private ensureConfigured(): void {
    if (!this.gateway.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'TELEGRAM_NOT_CONFIGURED',
        message: '请配置 TELEGRAM_API_ID 和 TELEGRAM_API_HASH。',
      });
    }
  }

  private requireChallenge(
    challengeId: string,
    stage: LoginChallenge['stage'],
  ): LoginChallenge {
    if (!this.challenge || this.challenge.id !== challengeId) {
      throw new BadRequestException({
        code: 'INVALID_LOGIN_CHALLENGE',
        message: '登录 challenge 无效。',
      });
    }
    if (this.challenge.expiresAt.getTime() <= Date.now()) {
      this.challenge = null;
      throw new GoneException({
        code: 'LOGIN_CHALLENGE_EXPIRED',
        message: '登录 challenge 已过期，请重新发送验证码。',
      });
    }
    if (this.challenge.stage !== stage) {
      throw new BadRequestException({
        code: 'INVALID_LOGIN_STAGE',
        message: '当前登录步骤不匹配。',
      });
    }
    return this.challenge;
  }

  private async persistAuthorizedUser(
    user: TelegramUserProfile,
  ): Promise<void> {
    const encrypted = this.sessionCrypto.encrypt(this.gateway.getSession());
    await this.prisma.telegramAccount.upsert({
      create: {
        authorizedAt: new Date(),
        displayName: user.displayName,
        id: ACCOUNT_ID,
        phoneNumber: user.phoneNumber,
        sessionAuthTag: encrypted.authTag,
        sessionCiphertext: encrypted.ciphertext,
        sessionIv: encrypted.iv,
        telegramUserId: user.telegramUserId,
        username: user.username,
      },
      update: {
        authorizedAt: new Date(),
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        sessionAuthTag: encrypted.authTag,
        sessionCiphertext: encrypted.ciphertext,
        sessionIv: encrypted.iv,
        telegramUserId: user.telegramUserId,
        username: user.username,
      },
      where: { id: ACCOUNT_ID },
    });
    this.authorized = true;
  }

  private maskPhone(value: string | null): string | null {
    if (!value || value.length < 5) {
      return value;
    }
    return `${value.slice(0, 3)}****${value.slice(-3)}`;
  }

  private mapTelegramError(error: unknown) {
    const code = telegramErrorCode(error);
    const invalidCodes = new Set([
      'PHONE_CODE_EMPTY',
      'PHONE_CODE_EXPIRED',
      'PHONE_CODE_INVALID',
      'PASSWORD_HASH_INVALID',
    ]);
    if (invalidCodes.has(code)) {
      return new BadRequestException({ code, message: 'Telegram 验证失败。' });
    }
    if (code.startsWith('FLOOD_WAIT')) {
      return new ServiceUnavailableException({
        code,
        message: 'Telegram 请求过于频繁，请稍后重试。',
      });
    }
    return new ServiceUnavailableException({
      code: 'TELEGRAM_REQUEST_FAILED',
      message: 'Telegram 请求失败，请稍后重试。',
    });
  }
}
