import { Controller, Get, Res, Session } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class AppController {
  @Get('/test')
  getHello(@Res() res) {
    res.render('index');
  }
  /**
   * Well-Known Asset Links
   *
   *
   * @see https://developer.android.com/training/app-links/verify-android-applinks
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

  /**
   * Index View
   *
   * @param session - Express Session
   * @param res - Express Response
   */
  @Get('/')
  root(@Session() session: Record<string, any>, @Res() res: Response) {
    session.active = true;
    if (session?.wallet) {
      res.redirect(307, '/dashboard');
    } else {
      res.render('index');
    }
  }
  @Get('/debug-sentry')
  testSentry() {
    throw new Error('My first Sentry error!');
  }
  /**
   * Dashboard View
   *
   * @param session - Express Session
   * @param res - Express Response
   */
  @Get('/dashboard')
  home(@Session() session: Record<string, any>, @Res() res: Response) {
    if (!session?.wallet) {
      res.redirect(307, '/');
    } else {
      res.render('dashboard', {
        wallet: session.wallet,
      });
    }
  }
}
