import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TelegramAuthService } from '../telegram/telegram-auth.service';
import { TelegramChatsService } from '../telegram/telegram-chats.service';
import { ApiAdminAuth, ApiTelegramErrorResponses } from './dto/error.dto';
import {
  ChatQueryDto,
  PaginatedTelegramChatsResponseDto,
  RefreshChatsResponseDto,
  SendCodeDto,
  SendCodeResponseDto,
  TelegramAccountResponseDto,
  TelegramAuthResultResponseDto,
  TelegramChatScanOptionsResponseDto,
  VerifyCodeDto,
  VerifyPasswordDto,
} from './dto/telegram.dto';

@ApiTags('Admin - Telegram')
@ApiAdminAuth()
@ApiTelegramErrorResponses()
@Controller('admin/v1/telegram')
export class AdminTelegramController {
  constructor(
    private readonly auth: TelegramAuthService,
    private readonly chats: TelegramChatsService,
  ) {}

  @Get('account')
  @ApiOkResponse({ type: TelegramAccountResponseDto })
  account() {
    return this.auth.getAccountStatus();
  }

  @Post('auth/code')
  @HttpCode(202)
  @ApiAcceptedResponse({ type: SendCodeResponseDto })
  sendCode(@Body() body: SendCodeDto) {
    return this.auth.sendCode(body.phoneNumber);
  }

  @Post('auth/code/verify')
  @HttpCode(200)
  @ApiOkResponse({ type: TelegramAuthResultResponseDto })
  verifyCode(@Body() body: VerifyCodeDto) {
    return this.auth.verifyCode(body.challengeId, body.code);
  }

  @Post('auth/password/verify')
  @HttpCode(200)
  @ApiOkResponse({ type: TelegramAuthResultResponseDto })
  verifyPassword(@Body() body: VerifyPasswordDto) {
    return this.auth.verifyPassword(body.challengeId, body.password);
  }

  @Delete('session')
  @HttpCode(204)
  @ApiNoContentResponse({ description: '本地 Telegram 会话已清除。' })
  logOut() {
    return this.auth.logOut();
  }

  @Post('chats/refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: RefreshChatsResponseDto })
  refreshChats() {
    return this.chats.refresh();
  }

  @Get('chats')
  @ApiOkResponse({ type: PaginatedTelegramChatsResponseDto })
  listChats(@Query() query: ChatQueryDto) {
    return this.chats.list(query);
  }

  @Get('chats/scan-options')
  @ApiOkResponse({ type: TelegramChatScanOptionsResponseDto })
  scanOptions() {
    return this.chats.scanOptions();
  }
}
