import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Logger,
  NotFoundException,

  Post,
  Req,
  Session,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import {AssertionCredentialJSON, PublicKeyCredentialRequestOptions} from './assertion.dto.js'
import { AuthService } from '../auth/auth.service.js';
import { AssertionService } from './assertion.service.js';
import { ClientProxy } from '@nestjs/microservices';

import { readFileSync } from 'node:fs';
import { join } from 'node:path'
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse, ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { User } from "../auth/auth.schema.js";
const filePath = join(process.cwd(), './src/assertion');
const requestDescription = readFileSync(join(filePath, 'assertion.controller.post.request.md')).toString();
const responseDescription = readFileSync(join(filePath, 'assertion.controller.post.response.md')).toString();
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
   * Hard Coded Request Assertion Options for demo
   */
  @Get('/request/:credId')
  async assertionDemoRequest(
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Body() body?: PublicKeyCredentialRequestOptions,
  ) {
    this.logger.log(
      `GET /request/${req.params.credId} for Session: ${session.id}`,
    );
    const user = await this.authService.search({
      'credentials.credId': req.params.credId,
    });

    if (!user) {
      throw new NotFoundException({
        reason: 'not_found',
        error: 'User not found.',
      });
    }

    // Get options, save challenge and respond
    const options = this.assertionService.request(
      user,
      req.params.credId,
      body,
    );

    return options;
  }
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
   * @param [body] - Standard Public Key Request Options
   */
  @Post('/request/:credId')
  @ApiOperation({ summary: 'Assertion Request', description: requestDescription })
  @ApiParam({ name: 'credId', description: 'Credential ID', required: true })
  @ApiBody({ type: PublicKeyCredentialRequestOptions })
  @ApiResponse({ status: 201, description: 'Successfully created options', type: PublicKeyCredentialRequestOptions })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async assertionRequest(
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Body() body?: PublicKeyCredentialRequestOptions,
  ) {
    this.logger.log(
      `POST /request/${req.params.credId} for Session: ${session.id}`,
    );
    const user = await this.authService.search({
      'credentials.credId': req.params.credId,
    });

    if (!user) {
      throw new NotFoundException({
        reason: 'not_found',
        error: 'User not found.',
      });
    }

    // Get options, save challenge and respond
    const options = this.assertionService.request(
      user,
      req.params.credId,
      body,
    );

    session.challenge = options.challenge;

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
   * @param req - Express Request
   * @param body - Assertion Credential JSON
   */
  @Post('/response')
  @ApiOperation({ summary: 'Assertion Response', description: responseDescription })
  @ApiBody({ type: AssertionCredentialJSON })
  @ApiResponse({ status: 201, description: 'Successfully attested public key', type: User })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async assertionResponse(
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Body() body: AssertionCredentialJSON & {clientExtensionResults: {liquid: {requestId: string}}},
  ) {
    this.logger.log(`POST /response for Session: ${session.id}`);
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
      throw new ForbiddenException({
        reason: 'not_found',
        error: 'Credential not found.',
      });
    }

    const user = this.assertionService.response(
      savedUser,
      body,
      expectedChallenge,
      req.get('User-Agent'),
    );

    await this.authService.update(user);
    const credential = await this.authService.findCredential(body.id);
    console.log(credential)
    delete session.challenge;
    session.wallet = user.wallet;
    this.client.emit<string>('auth', {
      requestId: body.clientExtensionResults.liquid.requestId,
      wallet: user.wallet,
      credId: credential.credId,
    });
    this.client.emit<string>('auth-interaction', {
      wallet: user.wallet,
      credential,
    });

    return user;
  }
}
