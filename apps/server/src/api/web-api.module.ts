import { Module } from '@nestjs/common';
import { WebApiController } from './web-api.controller';

@Module({ controllers: [WebApiController] })
export class WebApiModule {}
