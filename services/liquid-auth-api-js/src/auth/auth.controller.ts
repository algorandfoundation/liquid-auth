import {
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Res,
  Session,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from './auth.schema.js';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Display user keys
   *
   * @param session
   */
  @Get('/user')
  @ApiOperation({ summary: 'Get User' })
  @ApiResponse({ status: 200, description: 'Get the current user', type: User })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  async keys(@Session() session: Record<string, any>) {
    const wallet = session.wallet;
    return await this.authService.find(wallet);
  }
  /**
   * Delete Credential
   *
   * @param session - Express Session
   * @param id
   */
  @Delete('/keys/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete Credential' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiCookieAuth()
  async remove(
    @Session() session: Record<string, any>,
    @Param('id') id: string,
  ) {
    try {
      const user = await this.authService.find(session.wallet);

      if (!user) {
        throw new NotFoundException({
          error: 'User not found',
        });
      }

      await this.authService.removeCredential(user, id);

      return { success: true };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }

      throw new InternalServerErrorException({
        error: e.message,
      });
    }
  }

  @Get('/logout')
  @ApiOperation({ summary: 'Log Out' })
  logout(@Session() session: Record<string, any>, @Res() res: Response) {
    delete session.wallet;
    delete session.active;
    delete session.requestId;
    res.redirect(302, '/');
  }
  /**
   * Read Session
   *
   * @param session
   */
  @Get('/session')
  @ApiOperation({ summary: 'Get Session' })
  async read(@Session() session: Record<string, any>) {
    const user = await this.authService.find(session.wallet);
    return {
      user: user
        ? {
            id: user.id,
            wallet: user.wallet,
            credentials: user.credentials,
          }
        : null,
      session,
    };
  }
}
