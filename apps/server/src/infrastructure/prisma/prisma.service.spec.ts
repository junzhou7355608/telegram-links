import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const databaseUrl =
    'postgresql://telegram_links:telegram_links@localhost:5433/telegram_links';

  function createService() {
    const getOrThrow = jest.fn().mockReturnValue(databaseUrl);
    const configService = {
      getOrThrow,
    } as unknown as ConfigService;

    return {
      getOrThrow,
      service: new PrismaService(configService),
    };
  }

  it('requires DATABASE_URL when it is constructed', () => {
    const { getOrThrow, service } = createService();

    expect(service).toBeDefined();
    expect(getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
  });

  it('fails clearly when DATABASE_URL is missing', () => {
    const configService = {
      getOrThrow: jest.fn(() => {
        throw new Error('Configuration key "DATABASE_URL" does not exist');
      }),
    } as unknown as ConfigService;

    expect(() => new PrismaService(configService)).toThrow(
      'Configuration key "DATABASE_URL" does not exist',
    );
  });

  it('connects and disconnects with the NestJS module lifecycle', async () => {
    const { service } = createService();
    const connect = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);
    const disconnect = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
