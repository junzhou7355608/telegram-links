import { ConfigService } from '@nestjs/config';
import { SessionCryptoService } from './session-crypto.service';

describe('SessionCryptoService', () => {
  it('encrypts and authenticates a session string', () => {
    const config = new ConfigService({
      TELEGRAM_SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    });
    const service = new SessionCryptoService(config);
    const encrypted = service.encrypt('secret-session');

    expect(encrypted.ciphertext).not.toContain('secret-session');
    expect(service.decrypt(encrypted)).toBe('secret-session');
  });
});
