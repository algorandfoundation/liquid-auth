import {
  Body,
  Controller,
  Headers,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Session,
  UnauthorizedException,
} from '@nestjs/common';

import {
  AssertionCredentialJSON,
  PublicKeyCredentialRequestOptions,
} from './assertion.dto.js';
import { AuthService } from '../auth/auth.service.js';
import { AssertionService } from './assertion.service.js';
import { ClientProxy } from '@nestjs/microservices';

import {
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '../auth/auth.schema.js';
import { AuthenticationResponseJSON } from '@simplewebauthn/server';
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
// TODO: make a loader for descriptions
const requestDescription = '';
const responseDescription = '';

/**
 * Assertion Controller
 *
 * Handles assertion requests and responses from previously registered PublicKeyCredentials
 *
 */
@Controller('assertion')
@ApiTags('assertion')
export class AssertionController {
  private readonly logger = new Logger(AssertionController.name);
  constructor(
    @Inject('ACCOUNT_LINK_SERVICE') private client: ClientProxy,
    private assertionService: AssertionService,
    private authService: AuthService,
    private pairingService: PairingService,
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
   * @param credId - Credential ID to Lookup
   * @param [body] - Standard Public Key Request Options
   */
  @Post('/request/:credId')
  @ApiOperation({
    summary: 'Assertion Request',
    description: requestDescription,
  })
  @ApiParam({ name: 'credId', description: 'Credential ID', required: true })
  @ApiBody({ type: PublicKeyCredentialRequestOptions })
  @ApiResponse({
    status: 201,
    description: 'Successfully created options',
    type: PublicKeyCredentialRequestOptions,
  })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async request(
    @Session() session: Record<string, any>,
    @Param('credId') credId: string,
    @Body() body?: PublicKeyCredentialRequestOptions,
  ) {
    this.logger.log(`POST /request/${credId} for Session: ${session.id}`);
    this.logger.debug('Request Body', body);

    const user = await this.authService.search({
      'credentials.credId': credId,
    });
    if (!user) {
      throw new UnauthorizedException({
        reason: 'not_found',
        error: 'User not found.',
      });
    }

    let pairingRequestId: string | undefined;
    if (typeof body?.requestId === 'string') {
      pairingRequestId = await bindPairingIfPresent(
        this.pairingService,
        body.requestId,
      );
    }

    // Get options, save challenge and respond
    const options = await this.assertionService.request(user, credId, body);

    session.challenge = options.challenge;
    if (pairingRequestId) {
      session.pairingRequestId = pairingRequestId;
    } else {
      delete session.pairingRequestId;
    }

    this.logger.debug('Assertion Options', options);
    return options;
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
   * @param headers - Request Headers
   * @param body - Assertion Credential JSON
   */
  @Post('/response')
  @ApiOperation({
    summary: 'Assertion Response',
    description: responseDescription,
  })
  @ApiBody({ type: AssertionCredentialJSON })
  @ApiResponse({
    status: 201,
    description: 'Successfully attested public key',
    type: User,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async response(
    @Session()
    session: Record<string, any>,
    @Headers()
    headers: Record<string, any>,
    @Body()
    body: AuthenticationResponseJSON & {
      clientExtensionResults: { liquid: { requestId: string } };
    },
  ) {
    this.logger.log(`POST /response for Session: ${session.id}`);
    this.logger.debug('Authenticator Response', body);
    const expectedChallenge = session.challenge;
    const boundRequestId = session.pairingRequestId as string | undefined;
    const responseRequestId = body?.clientExtensionResults?.liquid?.requestId;
    if (typeof expectedChallenge !== 'string') {
      throw new UnauthorizedException({
        reason: 'unauthorized',
        error: 'Challenge not found.',
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
    const savedUser = await this.authService.search({
      'credentials.credId': body.id,
    });
    if (!savedUser) {
      throw new UnauthorizedException({
        reason: 'not_found',
        error: 'Credential not found.',
      });
    }
    let user: User;
    try {
      user = await this.assertionService.response(
        savedUser,
        body,
        expectedChallenge,
        headers['user-agent'],
      );
    } catch (e) {
      this.logger.error(e);
      throw new UnauthorizedException({
        reason: 'unauthorized',
        error: 'User verification failed.',
      });
    }

    const pairingRequestId =
      boundRequestId ||
      (typeof responseRequestId === 'string'
        ? await bindPairingIfPresent(this.pairingService, responseRequestId)
        : undefined);

    await this.authService.update(user);
    const pairing =
      typeof pairingRequestId === 'string'
        ? await this.pairingService.approveInvitation(
            pairingRequestId,
            user.wallet,
            body.id,
          )
        : undefined;

    delete session.challenge;
    delete session.pairingRequestId;
    session.wallet = user.wallet;
    await saveSession(session);
    // Emit the signin event for the given request id
    const authEvent: Record<string, any> = {
      requestId: pairingRequestId || responseRequestId,
      wallet: user.wallet,
      credId: body.id,
    };
    if (session.id) authEvent.sessionId = session.id;
    if (pairing) authEvent.pairingId = pairing.pairingId;
    this.client.emit<string>('auth', authEvent);
    this.logger.debug('User', user);
    return responseWithPairing(user, pairing);
  }
}
