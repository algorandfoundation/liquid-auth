import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  Session,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';

type LoginRequestDTO = {
  wallet: string;
};
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  /**
   * Debugging Route that shows all Users
   */
  @Get('/all')
  async all() {
    return await this.authService.all();
  }

  /**
   * Display user keys
   *
   * @param session
   */
  @Get('/keys')
  @UseGuards(AuthGuard)
  async keys(@Session() session: Record<string, any>) {
    const wallet = session.wallet;
    const user = await this.authService.find(wallet);
    return user || {};
  }
  /**
   * Delete Credential
   *
   * @param session - Express Session
   * @param req - Express Request
   */
  @Delete('/keys/:id')
  @UseGuards(AuthGuard)
  async remove(
    @Session() session: Record<string, any>,
    @Req() req: Request,
  ) {
    const user = await this.authService.find(session.wallet);

    if (!user) {
      throw new HttpException(
        { error: 'User not found' },
        HttpStatus.NOT_FOUND,
      );
    } else {
      try {
        await this.authService.removeCredential(user, req.params.id)
        return { success: true };
      } catch (e) {
        throw new HttpException(
          { error: e.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  @Get('/logout')
  logout(@Session() session: Record<string, any>, @Res() res: Response) {
    delete session.wallet;
    delete session.active;
    delete session.requestId;
    res.redirect(302, '/');
  }
  /**
   * Create Session / Login
   *
   * @remarks
   * Post credentials to the server, creates a new credential if it does not exist.
   * If this route has not been called, the application should not allow access to private
   * routes
   *
   * @param session - The session object
   * @param userLoginDto - The credentials to post
   */
  @Post('/session')
  async create(
    @Session() session: Record<string, any>,
    @Body() userLoginDto: LoginRequestDTO,
  ) {
    if (
      typeof userLoginDto.wallet !== 'string' ||
      userLoginDto.wallet.length !== 58
    ) {
      throw new HttpException(
        { reason: 'invalid_input', error: 'Invalid wallet' },
        HttpStatus.BAD_REQUEST,
      );
    } else {
      try {
        const user = await this.authService.init(userLoginDto.wallet);
        session.wallet = user.wallet;
        return user;
      } catch (e) {
        throw new HttpException(
          { error: e.message },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
  /**
   * Read Session
   *
   * @param session
   */
  @Get('/session')
  async read(@Session() session: Record<string, any>) {
    session.connected = true;
    const user = await this.authService.find(session.wallet);
    return user || {};
  }
}
