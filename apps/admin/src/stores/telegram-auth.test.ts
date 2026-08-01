import { describe, expect, it } from 'vitest';
import {
  createTelegramAuthChallenge,
  requireTelegramPassword,
} from './telegram-auth';

describe('Telegram auth challenge state', () => {
  it('starts at code verification and advances to password verification', () => {
    const codeChallenge = createTelegramAuthChallenge(
      {
        challengeId: '00000000-0000-4000-8000-000000000401',
        delivery: 'app',
        expiresAt: '2026-08-01T10:00:00.000Z',
      },
      '+8613800000000',
    );

    expect(codeChallenge).toMatchObject({
      phoneNumber: '+8613800000000',
      stage: 'code',
    });
    expect(requireTelegramPassword(codeChallenge)).toMatchObject({
      challengeId: codeChallenge.challengeId,
      stage: 'password',
    });
    expect(codeChallenge).not.toHaveProperty('code');
    expect(codeChallenge).not.toHaveProperty('password');
  });
});
