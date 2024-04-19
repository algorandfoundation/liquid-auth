import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
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
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@Controller('attestation')
@ApiTags('attestation')
@UseGuards(AuthGuard)
export class AttestationController {
  private readonly logger = new Logger(AttestationController.name);
  constructor(
    @Inject('ACCOUNT_LINK_SERVICE') private client: ClientProxy,
    private attestationService: AttestationService,
    private authService: AuthService,
  ) {}
  /**
   * Request Attestation Options
   *
   * Creates a challenge and returns the options for the
   * authentication client to create an attestation
   *
   * @param session - Express Session
   * @param options - Attestation Selector DTO
   * @param req - Express Request
   * @param res - Express Response
   */
  @Post('/request')
  @ApiOperation({summary: 'Attestation Request'})
  async request(
    @Session() session: Record<string, any>,
    @Body() options: AttestationSelectorDto, // TODO: Update to use internal Options
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(
      `POST /attestation/request for Session: ${session.id} and Wallet: ${session.wallet}`,
    );
    try {
      const wallet = session.wallet;
      if (!wallet) {
        res
          .status(401)
          .json({ reason: 'unauthorized', error: 'Wallet not connected' });
        return;
      }

      const user = await this.authService.find(wallet);
      if (!user) {
        res
          .status(403)
          .json({ reason: 'not_found', error: 'Wallet not found.' });
        return;
      }

      const attestationOptions = this.attestationService.request(user, options);

      session.challenge = attestationOptions.challenge;
      this.logger.debug(attestationOptions);
      res.json(attestationOptions);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * Register a Key
   */
  @Post('/response')
  @ApiOperation({ summary: 'Attestation Response' })
  async attestationResponse(
    @Session() session: Record<string, any>,
    @Body() body: AttestationCredentialJSON & { device?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`POST /attestation/response for Session: ${session.id}`);
    try {
      const username = session.wallet;
      const expectedChallenge = session.challenge;
      if (typeof expectedChallenge !== 'string') {
        res
          .status(404)
          .json({ reason: 'not_found', error: 'Challenge not found.' });
        return;
      }
      this.logger.debug(
        `Username: ${username} Challenge: ${expectedChallenge}`,
      );
      console.log(body);
      const credential = await this.attestationService.response(
        expectedChallenge,
        req.get('User-Agent'),
        body,
      );
      this.logger.debug(credential);
      const user = await this.authService.addCredential(username, credential);

      delete session.challenge;
      this.client.emit<string>('auth-interaction', {
        wallet: user.wallet,
        credential,
      });
      res.json(user);
    } catch (e) {
      this.logger.error(e.message, e.stack);
      res.status(500).json({ error: e.message });
    }
  }
}
