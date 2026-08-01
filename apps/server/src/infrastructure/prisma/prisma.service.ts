import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

export function databaseSchemaFromConnectionString(
  connectionString: string,
): string {
  try {
    return (
      new URL(connectionString).searchParams.get('schema')?.trim() || 'public'
    );
  } catch {
    return 'public';
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  readonly schemaName: string;

  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>('DATABASE_URL');
    const schemaName = databaseSchemaFromConnectionString(connectionString);
    super({
      adapter: new PrismaPg({ connectionString }, { schema: schemaName }),
    });
    this.schemaName = schemaName;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
