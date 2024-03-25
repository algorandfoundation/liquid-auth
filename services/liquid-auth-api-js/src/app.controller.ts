import { Controller, Get, Logger, Req, Res, Session } from '@nestjs/common';
import type { Response } from 'express';
import assetLinks from '../assetlinks.json' assert { type: 'json' };
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  /**
   * Serve the SPA
   *
   * @param req - Express request
   * @param res - Express Response
   * @param session - Express Session
   */
  @Get('/')
  root(
    @Req() req: Request,
    @Res() res: Response,
    @Session() session: Record<string, any>,
  ) {
    session.active = true;
    this.logger.log(
      `GET / Render for Session: ${session.id} UA: ${req.headers['user-agent']}`,
    );
    res.render('index');
  }
}
