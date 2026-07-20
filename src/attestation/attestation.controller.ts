import {
  Body,
  Controller,
  Inject,
  Logger,
  Post,
  Headers,
  NotFoundException,
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
import {
  PairingApprovalResult,
  PairingService,
} from '../pairings/pairing.service.js';

async function saveSession(session: Record<string, any>): Promise<void> {
  if (typeof session?.save !== 'function') return;
  await new Promise<void>((resolve, reject) => {
    session.save((error?: Error) => (error ? reject(error) : resolve()));
  });
}

function responseWithPairing(user: any, pairing?: PairingApprovalResult) {
  if (!pairing) return user;
  const serialized =
    typeof user?.toObject === 'function' ? user.toObject() : { ...user };
  return { ...serialized, pairing };
}

async function bindPairingIfPresent(
  pairingService: PairingService,
  requestId: string,
): Promise<string | undefined> {
  try {
    return (await pairingService.bindInvitation(requestId)).pairingId;
  } catch (error) {
    if (error instanceof NotFoundException) return undefined;
    throw error;
  }
}

@Controller('attestation')
@ApiTags('attestation')
export class AttestationController {
  private readonly logger = new Logger(AttestationController.name);
  constructor(
    @Inject('ACCOUNT_LINK_SERVICE') private client: ClientProxy,
    private attestationService: AttestationService,
    private authService: AuthService,
    private pairingService: PairingService,
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
  async request(
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
    let pairingRequestId: string | undefined;
    if (typeof options.requestId === 'string') {
      pairingRequestId = await bindPairingIfPresent(
        this.pairingService,
        options.requestId,
      );
    }
    // Request Attestation Options
    const attestationOptions = await this.attestationService.request(options);
    // This challenge is used to verify the response
    session.liquidExtension = true;
    session.challenge = attestationOptions.challenge;
    if (pairingRequestId) {
      session.pairingRequestId = pairingRequestId;
    } else {
      delete session.pairingRequestId;
    }
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
    const boundRequestId = session.pairingRequestId as string | undefined;
    const responseRequestId = body?.clientExtensionResults?.liquid?.requestId;
    // This request should only be called after a request
    if (typeof expectedChallenge !== 'string') {
      throw new UnauthorizedException({
        reason: 'unauthorized',
        error: 'Challenge not found',
      });
    }
    if (
      typeof boundRequestId === 'string' &&
      responseRequestId !== boundRequestId
    ) {
      throw new UnauthorizedException({
        reason: 'unauthorized',
        error: 'Pairing request does not match the issued challenge',
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

    const pairingRequestId =
      boundRequestId ||
      (typeof responseRequestId === 'string'
        ? await bindPairingIfPresent(this.pairingService, responseRequestId)
        : undefined);

    const username = body.clientExtensionResults.liquid.address;
    // Initialize a new user if it doesn't exist
    await this.authService.init(username);
    // Add the new credential to the user
    const user = await this.authService.addCredential(username, credential);
    const pairing =
      typeof pairingRequestId === 'string'
        ? await this.pairingService.approveInvitation(
            pairingRequestId,
            user.wallet,
            credential.credId,
          )
        : undefined;
    // Cleanup Session
    delete session.liquidExtension;
    delete session.challenge;
    delete session.pairingRequestId;
    // Authorize user with a wallet session
    session.wallet = username;
    await saveSession(session);
    // Handle Liquid Extension
    const authEvent: Record<string, any> = {
      requestId: pairingRequestId || responseRequestId,
      wallet: user.wallet,
      credId: credential.credId,
    };
    if (session.id) authEvent.sessionId = session.id;
    if (pairing) authEvent.pairingId = pairing.pairingId;
    this.client.emit<string>('auth', authEvent);

    this.logger.debug('User', user);
    return responseWithPairing(user, pairing);
  }
}
