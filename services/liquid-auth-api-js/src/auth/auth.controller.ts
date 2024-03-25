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
  async read(@Session() session: Record<string, any>) {
    const user = await this.authService.find(session.wallet);
    return (
      {
        user: user
          ? {
              id: user.id,
              wallet: user.wallet,
              credentials: user.credentials,
            }
          : null,
        session,
      } || {}
    );
  }
}
