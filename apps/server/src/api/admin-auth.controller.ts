import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { PublicAdminAuth } from '../auth/admin-auth-public.decorator';
import { ADMIN_SESSION_COOKIE_NAME } from '../auth/admin-auth.constants';
import { AdminAuthService } from '../auth/admin-auth.service';
import { AdminLoginDto, AdminSessionResponseDto } from './dto/admin-auth.dto';
import { ApiErrorResponseDto } from './dto/error.dto';

@ApiTags('Admin - Auth')
@PublicAdminAuth()
@Controller('admin/v1/auth/session')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Get()
  @ApiOkResponse({ type: AdminSessionResponseDto })
  session(@Req() request: Request): AdminSessionResponseDto {
    return this.auth.getSession(request.headers.cookie);
  }

  @Post()
  @HttpCode(200)
  @ApiOkResponse({ type: AdminSessionResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiTooManyRequestsResponse({ type: ApiErrorResponseDto })
  async login(
    @Ip() clientId: string,
    @Body() body: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminSessionResponseDto> {
    const session = await this.auth.login(
      clientId,
      body.username,
      body.password,
    );
    response.cookie(
      ADMIN_SESSION_COOKIE_NAME,
      session.token,
      this.auth.sessionCookieOptions(),
    );
    return { authenticated: true, username: session.username };
  }

  @Delete()
  @HttpCode(204)
  @ApiNoContentResponse({ description: '管理端会话已清除。' })
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(
      ADMIN_SESSION_COOKIE_NAME,
      this.auth.clearCookieOptions(),
    );
  }
}
