import { Global, Module } from '@nestjs/common';
import { AiGateway } from './ai.gateway';
import { AiService } from './ai.service';
import { KimiGateway } from './kimi.gateway';

@Global()
@Module({
  exports: [AiGateway, AiService],
  providers: [
    AiService,
    KimiGateway,
    { provide: AiGateway, useExisting: KimiGateway },
  ],
})
export class AiModule {}
