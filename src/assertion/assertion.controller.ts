import { Body, Controller, Post, Req, Res, Session } from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  AssertionCredentialJSON,
  PublicKeyCredentialRequestOptions,
} from '@simplewebauthn/typescript-types';

import { AuthService } from '../auth/auth.service.js';
import { AssertionService } from './assertion.service.js';

@Controller('assertion')
export class AssertionController {
  constructor(
    private assertionService: AssertionService,
    private authService: AuthService,
  ) {}

  /**
   * Request Assertion
   *
   * @remarks
   * This method is part of the {@link AssertionController}. It forms a valid
   * assertion request and returns it to the client. The client is responsible
   * for signing the assertion and returning it to the assertion response
   * route.
   *
   * @param session - Express Session
   * @param req - Express Request
   * @param res - Express Response
   * @param [body] - Standard Public Key Request Options
   */
  @Post('/request/:credId')
  async assertionRequest(
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: PublicKeyCredentialRequestOptions,
  ) {
    const user = await this.authService.search({
      'credentials.credId': req.params.credId,
    });
    console.log({ user, credId: req.params.credId });
    if (!user) {
      res.status(404).json({ reason: 'not_found', error: 'User not found.' });
      return;
    }

    // Get options, save challenge and respond
    const options = this.assertionService.request(
      user,
      req.params.credId,
      body,
    );
    console.log(options);
    session.challenge = options.challenge;
    res.json(options);
  }

  /**
   * Respond to Assertion
   *
   * @remarks
   * This method is part of the {@link AssertionController}. It verifies the
   * assertion from the client and updates the user's credentials. The client
   * must have a valid challenge in the session.
   *
   * @param session - Express Session
   * @param req - Express Request
   * @param res - Express Response
   * @param body - Assertion Credential JSON
   */
  @Post('/response')
  async assertionResponse(
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: AssertionCredentialJSON,
  ) {
    const expectedChallenge = session.challenge;
    if (!expectedChallenge) {
      res
        .status(404)
        .json({ reason: 'not_found', error: 'Challenge not found.' });
      return;
    }
    const savedUser = await this.authService.search({
      'credentials.credId': body.id,
    });
    if (!savedUser) {
      res.status(404).json({ reason: 'not_found', error: 'User not found.' });
      return;
    }

    const user = this.assertionService.response(
      savedUser,
      body,
      expectedChallenge,
      req.get('User-Agent'),
    );

    await this.authService.update(user);

    delete session.challenge;
    session.wallet = user.wallet;
    res.json(user);
  }
}
