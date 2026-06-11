import { Controller, Get, Header, Logger, Req } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Load the Apple App Site Association JSON from the project root.
 *
 * The file is intentionally extension-less per Apple's specification, so
 * a JSON import assertion cannot be used. It is read once at module load
 * from the process working directory (the project root in all run modes:
 * `nest start`, `node dist/src/main.js`, and `jest`).
 */
function loadAppleAppSiteAssociation(): {
  webcredentials?: { apps: string[] };
} {
  try {
    return JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'apple-app-site-association'),
        'utf-8',
      ),
    );
  } catch {
    return {};
  }
}

const appleAppSiteAssociation = loadAppleAppSiteAssociation();

@Controller('.well-known')
@ApiTags('.well-known')
export class IosController {
  private readonly logger = new Logger(IosController.name);

  /**
   * Apple App Site Association
   *
   * Served over HTTPS as `application/json`, with no redirects, per Apple's
   * Universal Links / Associated Domains requirements.
   *
   * @see https://developer.apple.com/documentation/xcode/supporting-associated-domains
   * @param req
   */
  @ApiOperation({ summary: 'Apple App Site Association' })
  @Get('/apple-app-site-association')
  @Header('Content-Type', 'application/json')
  appleAppSiteAssociation(@Req() req: Request) {
    this.logger.debug(
      `GET /.well-known/apple-app-site-association ${req.headers['user-agent']}`,
    );
    const result: {
      webcredentials: { apps: string[] };
    } = {
      webcredentials: {
        apps: [...(appleAppSiteAssociation.webcredentials?.apps ?? [])],
      },
    };

    // In Development, allow overriding/extending the apps list
    if (process.env.NODE_ENV === 'development') {
      if (
        process.env.IOS_APP_ID &&
        !result.webcredentials.apps.includes(process.env.IOS_APP_ID)
      ) {
        result.webcredentials.apps.push(process.env.IOS_APP_ID);
      }
    }

    return result;
  }
}
