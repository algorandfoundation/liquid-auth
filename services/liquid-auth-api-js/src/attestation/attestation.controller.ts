import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  Req,
  Res,
  Session,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AttestationCredentialJSON } from '@simplewebauthn/typescript-types';
import type { Request, Response } from 'express';

import { AuthService } from '../auth/auth.service.js';

import { AttestationService } from './attestation.service.js';
import { AttestationExtension, AttestationSelectorDto } from "./attestation.dto.js";
import { AuthGuard } from '../auth/auth.guard.js';
import { ClientProxy } from '@nestjs/microservices';
import { fromBase64Url } from "@liquid/core";

@Controller('attestation')
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
   */
  @Post('/request')
  async request(
    @Session() session: Record<string, any>,
    @Body() options: AttestationSelectorDto,
  ) {
    // Force unauthenticated users to prove they own a private key
    if(options.username !== session.wallet) {
      session.liquidExtension = options.username;
    }

    this.logger.log(
      `POST /attestation/request for Session: ${session.id} and Address: ${session.wallet}`,
    );
    const attestationOptions = this.attestationService.request(options);
    session.challenge = attestationOptions.challenge;
    this.logger.debug(attestationOptions);
    return attestationOptions
  }

  /**
   * Register a Key
   */
  @Post('/response')
  async attestationResponse(
    @Session() session: Record<string, any>,
    @Body() body: AttestationCredentialJSON & { clientExtensionResults: AttestationExtension},
    @Req() req: Request,
  ) {
    this.logger.log(`POST /attestation/response for Session: ${session.id}`);
    try {
      const username = session.liquidExtension;
      const expectedChallenge = session.challenge;
      if (typeof expectedChallenge !== 'string') {
        throw new NotFoundException({
          reason: 'not_found',
          error: 'Challenge not found',
        });
      }
      this.logger.debug(
        `Username: ${username} Challenge: ${expectedChallenge}`,
      );
      function arrayBufferToStr(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
      }
      const data = JSON.parse(arrayBufferToStr(fromBase64Url(body.response.clientDataJSON)))

      console.log('LEFFFFGGGG', data)
      console.log(body);
      const credential = await this.attestationService.response(
        expectedChallenge,
        req.get('User-Agent'),
        body,
      );
      this.logger.debug(body);
      await this.authService.init(username)
      const user = await this.authService.addCredential(username, credential);
      delete session.liquidExtension;
      delete session.challenge;
      session.wallet = username;
      const { wallet } = user;
      const credId = credential.credId;
      // const requestId = body.credentialrequestId;
      this.client.emit<string>('auth', {
        requestId: body.clientExtensionResults.liquid.requestId,
        wallet,
        credId,
      });
      this.client.emit<string>('auth-interaction', {
        wallet: user.wallet,
        credential,
      });

      return user;
    } catch (e) {
      this.logger.error(e.message, e.stack);

      if (e instanceof HttpException) {
        throw e;
      }

      throw new InternalServerErrorException({
        error: e.message,
      });
    }
  }
}
