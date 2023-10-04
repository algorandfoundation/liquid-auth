import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Session,
  UseGuards,
} from '@nestjs/common';
import type { AttestationCredentialJSON } from '@simplewebauthn/typescript-types';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service.js';

import { AttestationService } from './attestation.service.js';
import type { AttestationSelectorDto } from './attestation.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';

@Controller('attestation')
@UseGuards(AuthGuard)
export class AttestationController {
  constructor(
    private attestationService: AttestationService,
    private authService: AuthService,
  ) {}
  /**
   * Hard Coded Request Attestation Options
   */
  @Get('/request/:walletId')
  async demoRequest(
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const wallet = req.params.walletId;

      const user = await this.authService.find(wallet);
      if (!user) {
        res.redirect(307, '/');
      } else {
        const attestationOptions = this.attestationService.request(user, {
          attestationType: 'none',
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
        });

        res.json(attestationOptions);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
  /**
   * Request Attestation Options
   *
   * Creates a challenge and returns the options for the
   * authentication client to create an attestation
   *
   * @param session - Express Session
   * @param options - Attestation Selector DTO
   * @param res - Express Response
   */
  @Post('/request')
  async request(
    @Session() session: Record<string, any>,
    @Body() options: AttestationSelectorDto, // TODO: Update to use internal Options
    @Res() res: Response,
  ) {
    try {
      const wallet = session.wallet;

      const user = await this.authService.find(wallet);
      if (!user) res.redirect(307, '/');

      const attestationOptions = this.attestationService.request(user, options);

      session.challenge = attestationOptions.challenge;

      res.json(attestationOptions);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * Register a Key
   */
  @Post('/response')
  async attestationResponse(
    @Session() session: Record<string, any>,
    @Body() body: AttestationCredentialJSON,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const username = session.wallet;
      const expectedChallenge = session.challenge;
      if (typeof expectedChallenge !== 'string') {
        res
          .status(404)
          .json({ reason: 'not_found', error: 'Challenge not found.' });
        return;
      }
      const credential = await this.attestationService.response(
        expectedChallenge,
        req.get('User-Agent'),
        body,
      );

      const user = await this.authService.addCredential(username, credential);

      delete session.challenge;

      res.json(user);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}
