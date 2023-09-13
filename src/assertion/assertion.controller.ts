import { Body, Controller, Post, Req, Res, Session } from '@nestjs/common';
import {
  AssertionCredentialJSON,
  PublicKeyCredentialRequestOptions,
} from '@simplewebauthn/typescript-types';
import { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { AssertionService } from './assertion.service.js';

@Controller('assertion')
export class AssertionController {
  constructor(
    private assertionService: AssertionService,
    private authService: AuthService,
  ) {}
  @Post('/request')
  async assertionRequest(
    @Session() session: Record<string, any>,
    @Body() body: PublicKeyCredentialRequestOptions,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const username = session.wallet;
    const user = await this.authService.find(username);

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const options = this.assertionService.request(
      user,
      req.query?.credId as string,
      body,
    );

    session.challenge = options.challenge;

    res.json(options);
  }

  @Post('/response')
  async assertionResponse(
    @Session() session: Record<string, any>,
    @Body() body: AssertionCredentialJSON,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const expectedChallenge = session.challenge;
    if (!expectedChallenge) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }
    const user = await this.authService.find(session.wallet);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const _user = this.assertionService.response(
      user,
      body,
      expectedChallenge,
      req.get('User-Agent'),
    );

    await this.authService.update(_user);

    delete session.challenge;

    res.json(user);
  }
}
