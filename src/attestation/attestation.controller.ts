import {
  Body,
  Controller,
  Inject,
  Logger,
  Post,
  Headers,
  Session,
  UnauthorizedException,
  NotImplementedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from '../auth/auth.service.js';
import { AttestationService } from './attestation.service.js';
import {
  AttestationCredentialJSONDto,
  AttestationSelectorDto,
} from './attestation.dto.js';

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
   * @param {Session} session - Express Session
   * @param {AttestationSelectorDto} options - Attestation Selector DTO
   */
  @Post('/request')
  @ApiOperation({ summary: 'Attestation Request' })
  request(
    @Session() session: Record<string, any>,
    @Body() options: AttestationSelectorDto,
  ) {
    this.logger.log(
      `POST /attestation/request for Session: ${session.id} and Address: ${session.wallet}`,
    );
    this.logger.debug('Attestation Selector', options);
    // Enforce the liquid extension
    if (typeof options?.extensions?.liquid === 'undefined') {
      throw new NotImplementedException({
        reason: 'not_implemented',
        error: 'Liquid extension is required',
      });
    }
    session.liquidExtension = true;
    // Request Attestation Options
    const attestationOptions = this.attestationService.request(options);
    // This challenge is used to verify the response
    session.challenge = attestationOptions.challenge;
    // Return the Attestation Options
    this.logger.debug('Attestation Options', attestationOptions);
    return attestationOptions;
  }

  /**
   * Validate Attestation Response
   *
   * Validates the attestation response from the authenticator and adds the credential to the user.
   *
   * @param {Session} session - Express Session
   * @param {Headers} headers - Express Request
   * @param {AttestationCredentialJSONDto} body - Attestation Credential JSON DTO
   *
   */
  @Post('/response')
  @ApiOperation({ summary: 'Attestation Response' })
  async response(
    @Session() session: Record<string, any>,
    @Headers() headers: Record<string, any>,
    @Body()
    body: AttestationCredentialJSONDto,
  ) {
    this.logger.log(`POST /attestation/response for Session: ${session.id}`);
    this.logger.debug(`Authenticator Response`, body);
    // Session state
    const isLiquid = session.liquidExtension || false;
    const expectedChallenge = session.challenge;
    // This request should only be called after a request
    if (typeof expectedChallenge !== 'string') {
      throw new UnauthorizedException({
        reason: 'unauthorized',
        error: 'Challenge not found',
      });
    }
    // If the liquid extension is enabled, the client must send the liquid extension
    if (
      isLiquid &&
      typeof body?.clientExtensionResults?.liquid === 'undefined'
    ) {
      throw new UnauthorizedException({
        reason: 'unauthorized',
        error: 'Liquid extension not found',
      });
    }
    // Service only supports liquid extension
    if (!isLiquid) {
      throw new NotImplementedException({
        reason: 'not_implemented',
        error: 'Liquid extension is required',
      });
    }
    // Verify the Credential and Liquid Extension
    const credential = await this.attestationService
      .response(expectedChallenge, headers['user-agent'], body)
      .catch((e) => {
        this.logger.error(e);
        throw new UnauthorizedException({
          reason: 'unauthorized',
          error: 'User verification failed',
        });
      });

    const username = body.clientExtensionResults.liquid.address;
    // Initialize a new user if it doesn't exist
    await this.authService.init(username);
    // Add the new credential to the user
    const user = await this.authService.addCredential(username, credential);
    // Cleanup Session
    delete session.liquidExtension;
    delete session.challenge;
    // Authorize user with a wallet session
    session.wallet = username;
    // Handle Liquid Extension
    if (
      typeof body?.clientExtensionResults?.liquid?.requestId !== 'undefined'
    ) {
      this.client.emit<string>('auth', {
        requestId: body.clientExtensionResults.liquid.requestId,
        wallet: user.wallet,
        credId: credential.credId,
      });
    }

    this.logger.debug('User', user);
    return user;
  }
}
