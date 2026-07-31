import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EncryptedSession {
  authTag: string;
  ciphertext: string;
  iv: string;
}

@Injectable()
export class SessionCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(value: string): EncryptedSession {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    return {
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
    };
  }

  decrypt(value: EncryptedSession): string {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getKey(),
      Buffer.from(value.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getKey(): Buffer {
    const encoded = this.configService.get<string>(
      'TELEGRAM_SESSION_ENCRYPTION_KEY',
    );
    if (!encoded) {
      throw new ServiceUnavailableException({
        code: 'TELEGRAM_NOT_CONFIGURED',
        message: '缺少 TELEGRAM_SESSION_ENCRYPTION_KEY。',
      });
    }

    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32) {
      throw new ServiceUnavailableException({
        code: 'INVALID_TELEGRAM_SESSION_KEY',
        message: 'TELEGRAM_SESSION_ENCRYPTION_KEY 必须是 32 字节 Base64。',
      });
    }
    return key;
  }
}
