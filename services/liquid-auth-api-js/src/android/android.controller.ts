import { Controller, Get, Logger, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
//@ts-ignore, required for jest
import assetLinks from '../../assetlinks.json' assert { type: 'json' };
import { ApiOperation, ApiTags } from "@nestjs/swagger";
@Controller('.well-known')
@ApiTags('.well-known')
export class AndroidController {
  private readonly logger = new Logger(AndroidController.name);

  /**
   * Well-Known Asset Links
   *
   * @see https://developer.android.com/training/app-links/verify-android-applinks
   * @param req
   * @param res
   *
   */
  @ApiOperation({ summary: 'Asset Links' })
  @Get('/assetlinks.json')
  assetLinks(@Req() req: Request, @Res() res: Response) {
    this.logger.debug(
      `GET /.well-known/assetlinks.json ${req.headers['user-agent']}`,
    );
    // In Development, allow for overriding the asset links
    if (process.env.NODE_ENV === 'development') {
      const relation = [
        'delegate_permission/common.handle_all_urls',
        'delegate_permission/common.get_login_creds',
      ];
      if (!assetLinks.some((al) => al.target.site === process.env.ORIGIN)) {
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
        !assetLinks.some(
          (al) => al.target.package_name === process.env.ANDROID_PACKAGENAME,
        )
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
}
