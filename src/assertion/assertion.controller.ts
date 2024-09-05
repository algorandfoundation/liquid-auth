import {
  Body,
  Controller,
  Headers,
  Inject,
  Logger,
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

    // Get options, save challenge and respond
    const options = this.assertionService.request(user, credId, body);

    session.challenge = options.challenge;

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
    body: AssertionCredentialJSON & {
      clientExtensionResults: { liquid: { requestId: string } };
    },
  ) {
    this.logger.log(`POST /response for Session: ${session.id}`);
    this.logger.debug('Authenticator Response', body);
    const expectedChallenge = session.challenge;
    if (typeof expectedChallenge !== 'string') {
      throw new UnauthorizedException({
        reason: 'unauthorized',
        error: 'Challenge not found.',
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
      user = this.assertionService.response(
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

    await this.authService.update(user);

    delete session.challenge;
    session.wallet = user.wallet;
    // Emit the signin event for the given request id
    if (
      typeof body?.clientExtensionResults?.liquid?.requestId !== 'undefined'
    ) {
      this.client.emit<string>('auth', {
        requestId: body.clientExtensionResults.liquid.requestId,
        wallet: user.wallet,
        credId: body.id,
      });
    }
    this.logger.debug('User', user);
    return user;
  }
}
