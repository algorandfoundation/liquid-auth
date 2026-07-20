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
import { SignalsGateway } from '../signals/signals.gateway.js';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private signalsGateway: SignalsGateway,
  ) {}

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
    // Presence: report the live device count for this session's requestId
    // rather than a value persisted earlier. Counting on read avoids the race
    // where a peer joined the request room after the last persisted update, so
    // the session information always reflects how many devices are currently
    // connected (used to decide whether an offline client should reconnect).
    if (typeof session.requestId === 'string' && session.requestId.length > 0) {
      session.deviceCount = await this.signalsGateway.countDevices(
        session.requestId,
      );
    }
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
