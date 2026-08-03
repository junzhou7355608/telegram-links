import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('healthz')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok' as const };
  }
}
