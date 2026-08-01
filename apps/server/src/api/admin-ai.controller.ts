import { Body, Controller, Delete, Get, HttpCode, Put } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AiService } from '../ai/ai.service';
import {
  AiModelsResponseDto,
  AiSettingsResponseDto,
  SetAiApiKeyDto,
  SetAiModelDto,
} from './dto/ai.dto';
import { ApiAiErrorResponses } from './dto/error.dto';

@ApiTags('Admin - AI')
@ApiAiErrorResponses()
@Controller('admin/v1/ai')
export class AdminAiController {
  constructor(private readonly ai: AiService) {}

  @Get('settings')
  @ApiOkResponse({ type: AiSettingsResponseDto })
  settings() {
    return this.ai.getSettings();
  }

  @Put('settings/key')
  @ApiOkResponse({ type: AiSettingsResponseDto })
  setKey(@Body() body: SetAiApiKeyDto) {
    return this.ai.setKey(body.apiKey);
  }

  @Delete('settings/key')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Kimi API Key 已清除。' })
  clearKey() {
    return this.ai.clearKey();
  }

  @Get('models')
  @ApiOkResponse({ type: AiModelsResponseDto })
  async models() {
    return { items: await this.ai.listModels() };
  }

  @Put('settings/model')
  @ApiOkResponse({ type: AiSettingsResponseDto })
  setModel(@Body() body: SetAiModelDto) {
    return this.ai.setModel(body.model);
  }
}
