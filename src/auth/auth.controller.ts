import {
  Body,
  Controller,
  Delete,
  Get,
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
   * @param res
   */
  @Get('/all')
  async all(@Res() res: Response) {
    res.json(await this.authService.all());
  }

  /**
   * Display user keys
   *
   * @param session
   * @param res
   */
  @Get('/keys')
  @UseGuards(AuthGuard)
  async keys(@Session() session: Record<string, any>, @Res() res: Response) {
    const wallet = session.wallet;
    const user = await this.authService.find(wallet);
    res.json(user || {});
  }
  /**
   * Delete Credential
   *
   * @param session - Express Session
   * @param req - Express Request
   * @param res - Express Response
   */
  @Delete('/keys/:id')
  @UseGuards(AuthGuard)
  async remove(
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = await this.authService.find(session.wallet);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      this.authService
        .removeCredential(user, req.params.id)
        .then(() => {
          res.json({ success: true });
        })
        .catch((e) => {
          res.status(500).json({ error: e.message });
        });
    }
  }

  @Get('/logout')
  logout(@Session() session: Record<string, any>, @Res() res: Response) {
    delete session.wallet;
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
   * @param res - The response object
   */
  @Post('/session')
  async create(
    @Session() session: Record<string, any>,
    @Body() userLoginDto: LoginRequestDTO,
    @Res() res: Response,
  ) {
    if (
      typeof userLoginDto.wallet !== 'string' ||
      userLoginDto.wallet.length !== 58
    ) {
      res
        .status(400)
        .json({ reason: 'invalid_input', error: 'Invalid wallet' });
    } else {
      try {
        const user = await this.authService.init(userLoginDto.wallet);
        session.wallet = user.wallet;
        res.json(user);
      } catch (e) {
        res.status(500).json({ error: e.message });
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
    const user = await this.authService.find(session.wallet);
    return user || {};
  }
}
