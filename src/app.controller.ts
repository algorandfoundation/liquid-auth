import { Controller, Get, Logger, Res, Session } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  @Get('/test')
  getHello(@Res() res) {
    res.render('index');
  }
  /**
   * Android Asset Links
   *
   * Redirect to the Android app if installed
   *
   * @param res
   */
  @Get('/.well-known/assetlinks.json')
  assetLinks(@Res() res: Response) {
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
  @Get('/')
  root(@Session() session: Record<string, any>, @Res() res: Response) {
    if (session?.wallet) {
      this.logger.log('No Wallet for Index, Redirecting');
      res.redirect(307, '/dashboard');
    } else {
      res.render('index');
    }
  }
  @Get('/dashboard')
  home(@Session() session: Record<string, any>, @Res() res: Response) {
    if (!session?.wallet) {
      this.logger.log(
        'No Wallet for Dashboard, Redirecting',
        JSON.stringify(session),
      );
      res.redirect(307, '/');
    } else {
      return res.render('dashboard', {
        wallet: session.wallet,
      });
    }
  }
}
