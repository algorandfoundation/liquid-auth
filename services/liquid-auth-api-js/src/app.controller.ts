import { Controller, Get, Logger, Req, Res, Session } from '@nestjs/common';
import type { Response } from 'express';
import assetLinks from '../assetlinks.json' assert { type: 'json' }
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
    // In Development, allow for overriding the asset links
    if(process.env.NODE_ENV === 'development'){
      const relation = [
        'delegate_permission/common.handle_all_urls',
        'delegate_permission/common.get_login_creds',
      ];
      if(!assetLinks.some((al)=>al.target.site === process.env.ORIGIN)) {
        assetLinks.push({
          relation,
          target: {
            namespace: 'web',
            site: process.env.ORIGIN,
          },
        });
      }

      if (
          process.env.ANDROID_PACKAGENAME &&
          process.env.ANDROID_SHA256HASH &&
          !assetLinks.some((al)=>al.target.package_name === process.env.ANDROID_PACKAGENAME)
      ) {
        assetLinks.push({
          relation,
          target: {
            namespace: 'android_app',
            package_name: process.env.ANDROID_PACKAGENAME,
            sha256_cert_fingerprints: [process.env.ANDROID_SHA256HASH],
          },
        });
      }
    }
    res.json(assetLinks);
  }

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