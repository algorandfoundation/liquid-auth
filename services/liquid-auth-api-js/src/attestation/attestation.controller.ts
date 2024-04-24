import {
  Body,
  Controller,
  HttpException,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  Req,
  Session,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from '../auth/auth.service.js';

import { AttestationService } from './attestation.service.js';
import {
  AttestationCredentialJSONDto,
  AttestationSelectorDto,
} from './attestation.dto.js';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('attestation')
@ApiTags('attestation')
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
   */
  @Post('/request')
  @ApiOperation({ summary: 'Attestation Request' })
  async request(
    @Session() session: Record<string, any>,
    @Body() options: AttestationSelectorDto,
  ) {
    this.logger.debug(options);
    // Enable the liquid extension if the username is different or the liquid extension is enabled
    if (
      options.username !== session.wallet ||
      options?.extensions?.liquid === true
    ) {
      session.liquidExtension = options.username;
    }

    this.logger.log(
      `POST /attestation/request for Session: ${session.id} and Address: ${session.wallet}`,
    );
    const attestationOptions = this.attestationService.request(options);
    session.challenge = attestationOptions.challenge;
    this.logger.debug(attestationOptions);
    return attestationOptions;
  }

  /**
   * Register a Key
   */
  @Post('/response')
  @ApiOperation({ summary: 'Attestation Response' })
  async attestationResponse(
    @Session() session: Record<string, any>,
    @Body()
    body: AttestationCredentialJSONDto,
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
      if (
        typeof session.liquidExtension !== 'undefined' &&
        typeof body?.clientExtensionResults?.liquid === 'undefined'
      ) {
        throw new NotFoundException({
          reason: 'not_found',
          error: 'Liquid extension not found',
        });
      }
      this.logger.debug(
        `Username: ${username} Challenge: ${expectedChallenge}`,
      );

      const credential = await this.attestationService.response(
        expectedChallenge,
        req.get('User-Agent'),
        body,
      );
      this.logger.debug(body);
      await this.authService.init(username);
      const user = await this.authService.addCredential(username, credential);
      delete session.liquidExtension;
      delete session.challenge;
      session.wallet = username;
      const { wallet } = user;
      const credId = credential.credId;
      if (
        typeof body?.clientExtensionResults?.liquid?.requestId !== 'undefined'
      ) {
        this.client.emit<string>('auth', {
          requestId: body.clientExtensionResults.liquid.requestId,
          wallet,
          credId,
        });
      }
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
