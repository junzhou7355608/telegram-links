import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashSync } from 'bcryptjs';
import { ADMIN_SESSION_COOKIE_NAME } from './admin-auth.constants';
import { AdminAuthService } from './admin-auth.service';

const username = 'admin';
const password = 'correct horse battery staple';
const passwordHash = hashSync(password, 4);
const sessionSecret = Buffer.alloc(32, 9).toString('base64');

function createService(overrides: Record<string, string> = {}) {
  return new AdminAuthService(
    new ConfigService({
      ADMIN_AUTH_SESSION_SECRET: sessionSecret,
      BASIC_AUTH_PASSWORD_HASH: passwordHash,
      BASIC_AUTH_USERNAME: username,
      NODE_ENV: 'test',
      ...overrides,
    }),
  );
}

describe('AdminAuthService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a seven-day session for valid credentials', async () => {
    const auth = createService();
    const result = await auth.login('127.0.0.1', username, password);

    expect(
      auth.getSession(
        `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(result.token)}`,
      ),
    ).toEqual({ authenticated: true, username });
    expect(auth.sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/admin/v1',
      sameSite: 'strict',
      secure: false,
    });
  });

  it('rejects invalid credentials without identifying the wrong field', async () => {
    const auth = createService();

    await expect(
      auth.login('127.0.0.1', 'someone-else', 'wrong-password'),
    ).rejects.toMatchObject({
      response: {
        code: 'INVALID_ADMIN_CREDENTIALS',
        message: '用户名或密码不正确。',
      },
    });
  });

  it('rejects tampered and expired sessions', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
    const auth = createService();
    const { token } = await auth.login('127.0.0.1', username, password);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(
      auth.isAuthenticated(`${ADMIN_SESSION_COOKIE_NAME}=${tampered}`),
    ).toBe(false);

    jest.setSystemTime(new Date('2026-08-11T00:00:01.000Z'));
    expect(auth.isAuthenticated(`${ADMIN_SESSION_COOKIE_NAME}=${token}`)).toBe(
      false,
    );
  });

  it('invalidates sessions when the configured credentials rotate', async () => {
    const original = createService();
    const { token } = await original.login('127.0.0.1', username, password);
    const rotated = createService({
      BASIC_AUTH_PASSWORD_HASH: hashSync('new-password', 4),
    });

    expect(
      rotated.isAuthenticated(`${ADMIN_SESSION_COOKIE_NAME}=${token}`),
    ).toBe(false);
  });

  it('blocks a client after five failed attempts for fifteen minutes', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
    const auth = createService();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        auth.login('blocked-client', username, 'wrong-password'),
      ).rejects.toBeDefined();
    }

    const blocked = await auth
      .login('blocked-client', username, password)
      .catch((error: unknown) => error);
    expect(blocked).toBeInstanceOf(HttpException);
    expect((blocked as HttpException).getStatus()).toBe(429);

    jest.setSystemTime(new Date('2026-08-04T00:15:01.000Z'));
    await expect(
      auth.login('blocked-client', username, password),
    ).resolves.toMatchObject({ username });
  });

  it('fails closed when credentials or the session secret are missing', async () => {
    const auth = createService({ ADMIN_AUTH_SESSION_SECRET: '' });

    await expect(
      auth.login('127.0.0.1', username, password),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(auth.getSession(undefined)).toEqual({ authenticated: false });
  });
});
