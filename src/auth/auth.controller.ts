import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  Session,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

type LoginRequestDTO = {
  wallet: string;
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Get('/keys')
  async keys(@Session() session: Record<string, any>, @Res() res: Response) {
    const wallet = session.wallet;
    if (wallet) {
      const user = await this.authService.find(wallet);
      res.json({ credentials: user.credentials });
    } else {
      res.json({});
    }
  }
  /**
   * Delete Credential
   *
   * @param session - Express Session
   * @param req - Express Request
   * @param res - Express Response
   */
  @Delete('/keys/:id')
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
    try {
      const user = await this.authService.init(userLoginDto.wallet);
      session.wallet = user.wallet;
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: e.message });
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
