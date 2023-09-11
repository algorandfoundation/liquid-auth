import { Body, Controller, Get, Post, Req, Res, Session } from '@nestjs/common';
import type { Response } from 'express';
import fido2 from '@simplewebauthn/server';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';

type LoginRequestDTO = {
  wallet: string;
};

const RP_NAME = 'Algorand Foundation FIDO2 Server';
const TIMEOUT = 30 * 1000 * 60;

// type LoginRequestDTO = {
//   username: string;
//   password: string;
//   id: string;
// };

type AuthenticatorSelectionDto = {
  authenticatorAttachment?: string;
  requireResidentKey?: boolean;
  userVerification?: string;
  attestation?: AttestationConveyancePreference;
};
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {} // Register a credential key

  /**
   * TODO: Dive deep into the fido2/webauthn protocols
   */
  @Post('/register')
  async register(@Session() session: Record<string, any>, @Req() req: Request) {
    const username = session.username;
    const user = await this.authService.find(username);
    const excludeCredentials = [];
    if (user.credentials.length > 0) {
      for (const cred of user.credentials) {
        excludeCredentials.push({
          id: cred.credId,
          type: 'public-key',
          transports: ['internal'],
        });
      }
    }
    const pubKeyCredParams = [];
    // const params = [-7, -35, -36, -257, -258, -259, -37, -38, -39, -8];
    const params = [-7, -257];
    for (const param of params) {
      pubKeyCredParams.push({ type: 'public-key', alg: param });
    }
    const as: AuthenticatorSelectionDto = {}; // authenticatorSelection
    const aa = req.body.authenticatorSelection.authenticatorAttachment;
    const rr = req.body.authenticatorSelection.requireResidentKey;
    const uv = req.body.authenticatorSelection.userVerification;
    const cp = req.body.attestation; // attestationConveyancePreference
    let asFlag = false;
    let authenticatorSelection;
    let attestation: AttestationConveyancePreference = 'none';

    if (aa && (aa == 'platform' || aa == 'cross-platform')) {
      asFlag = true;
      as.authenticatorAttachment = aa;
    }
    if (rr && typeof rr == 'boolean') {
      asFlag = true;
      as.requireResidentKey = rr;
    }
    if (uv && (uv == 'required' || uv == 'preferred' || uv == 'discouraged')) {
      asFlag = true;
      as.userVerification = uv;
    }
    if (asFlag) {
      authenticatorSelection = as;
    }
    if (cp && (cp == 'none' || cp == 'indirect' || cp == 'direct')) {
      attestation = cp;
    }

    // TOOD: Investigate fido2 simple server to breakdown what it is doing
    const options = fido2.generateAttestationOptions({
      rpName: RP_NAME,
      rpID: process.env.HOSTNAME,
      userID: user.wallet,
      userName: `fido2.algorand.foundation-${user.wallet}`,
      timeout: TIMEOUT,
      // Prompt users for additional information about the authenticator.
      attestationType: attestation,
      // Prevent users from re-registering existing authenticators
      excludeCredentials,
      authenticatorSelection,
    });

    session.challenge = options.challenge;

    // Temporary hack until SimpleWebAuthn supports `pubKeyCredParams`
    options.pubKeyCredParams = [];
    for (const param of params) {
      options.pubKeyCredParams.push({ type: 'public-key', alg: param });
    }
  }
  @Get('/logout')
  logout(@Session() session: Record<string, any>, @Res() res: Response) {
    delete session.wallet;
    res.redirect(302, '/');
  }
  /**
   * Create Session / Login
   *
   * @remarks
   * Post credentials to the server, creates a new credential if it does not exist
   *
   * @param session - The session object
   * @param userLoginDto - The credentials to post
   * @param res - The response object
   */
  @Post('/session')
  async create(
    @Session() session: Record<string, any>,
    @Body() userLoginDto: LoginRequestDTO,
    @Res() res: Response,
  ) {
    try {
      const user = await this.authService.init(userLoginDto.wallet);
      session.wallet = user.wallet;
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  /**
   * Read Session
   *
   * @param session
   */
  @Get('/session')
  async read(@Session() session: Record<string, any>) {
    const user = await this.authService.find(session.id);
    return user || {};
  }
}
