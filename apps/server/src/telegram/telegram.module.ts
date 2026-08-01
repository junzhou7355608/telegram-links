import { Global, Module } from '@nestjs/common';
import { GramJsGateway } from './gramjs.gateway';
import { SessionCryptoService } from './session-crypto.service';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramChatsService } from './telegram-chats.service';
import { TelegramGateway } from './telegram.gateway';

@Global()
@Module({
  exports: [
    SessionCryptoService,
    TelegramAuthService,
    TelegramChatsService,
    TelegramGateway,
  ],
  providers: [
    GramJsGateway,
    SessionCryptoService,
    TelegramAuthService,
    TelegramChatsService,
    { provide: TelegramGateway, useExisting: GramJsGateway },
  ],
})
export class TelegramModule {}
