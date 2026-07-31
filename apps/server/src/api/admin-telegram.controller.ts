import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseUUIDPipe,
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
import {
  ChatQueryDto,
  SendCodeDto,
  UpdateChatDto,
  VerifyCodeDto,
  VerifyPasswordDto,
} from './api.dto';

@ApiTags('Admin - Telegram')
@Controller('admin/v1/telegram')
export class AdminTelegramController {
  constructor(
    private readonly auth: TelegramAuthService,
    private readonly chats: TelegramChatsService,
  ) {}

  @Get('account')
  @ApiOkResponse({ description: 'Telegram 配置与授权状态。' })
  account() {
    return this.auth.getAccountStatus();
  }

  @Post('auth/code')
  @HttpCode(202)
  @ApiAcceptedResponse({ description: '验证码已请求。' })
  sendCode(@Body() body: SendCodeDto) {
    return this.auth.sendCode(body.phoneNumber);
  }

  @Post('auth/code/verify')
  @HttpCode(200)
  @ApiOkResponse({ description: '验证码验证结果。' })
  verifyCode(@Body() body: VerifyCodeDto) {
    return this.auth.verifyCode(body.challengeId, body.code);
  }

  @Post('auth/password/verify')
  @HttpCode(200)
  @ApiOkResponse({ description: '2FA 验证结果。' })
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
  @ApiOkResponse({ description: 'Telegram 聊天列表已刷新。' })
  refreshChats() {
    return this.chats.refresh();
  }

  @Get('chats')
  @ApiOkResponse({ description: 'Telegram 聊天列表。' })
  listChats(@Query() query: ChatQueryDto) {
    return this.chats.list(query);
  }

  @Patch('chats/:id')
  @ApiOkResponse({ description: '聊天同步开关已更新。' })
  updateChat(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateChatDto,
  ) {
    return this.chats.setEnabled(id, body.isEnabled);
  }
}
