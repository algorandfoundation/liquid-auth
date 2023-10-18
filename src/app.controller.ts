import { Controller, Get, Logger, Req, Res, Session } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  /**
   * Well-Known Asset Links
   *
   *
   * @see https://developer.android.com/training/app-links/verify-android-applinks
   * @param req
   * @param res
   *
   */
  @Get('/.well-known/assetlinks.json')
  assetLinks(@Req() req: Request, @Res() res: Response) {
    this.logger.debug(
      `GET /.well-known/assetlinks.json ${req.headers['user-agent']}`,
    );
    const assetlinks = [];
    const relation = [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ];
    assetlinks.push({
      relation: relation,
      target: {
        namespace: 'web',
        site: process.env.ORIGIN,
      },
    });
    if (process.env.ANDROID_PACKAGENAME && process.env.ANDROID_SHA256HASH) {
      assetlinks.push({
        relation: relation,
        target: {
          namespace: 'android_app',
          package_name: process.env.ANDROID_PACKAGENAME,
          sha256_cert_fingerprints: [process.env.ANDROID_SHA256HASH],
        },
      });
    }
    res.json(assetlinks);
  }

  /**
   * Index View
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
    if (session?.wallet) {
      this.logger.log(
        `GET / Redirect for Session: ${session.id} with Wallet: ${session.wallet}`,
      );
      res.redirect(307, '/dashboard');
    } else {
      this.logger.log(
        `GET / Render for Session: ${session.id} UA: ${req.headers['user-agent']}`,
      );
      res.render('index');
    }
  }
  /**
   * Dashboard View
   *
   * @param req - Express Request
   * @param session - Express Session
   * @param res - Express Response
   */
  @Get('/dashboard')
  home(
    @Req() req: Request,
    @Res() res: Response,
    @Session() session: Record<string, any>,
  ) {
    this.logger.debug(`GET /dashboard ${req.headers['user-agent']}`);
    if (!session?.wallet) {
      this.logger.log(`GET /dashboard Redirect for Session: ${session.id}`);

      res.redirect(307, '/');
    } else {
      this.logger.log(
        `GET /dashboard Render for Session: ${session.id} with Wallet: ${session.wallet}`,
      );
      res.render('dashboard', {
        wallet: session.wallet,
      });
    }
  }
}
