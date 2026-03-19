import { Injectable } from '@nestjs/common';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { User } from '../auth/auth.schema.js';
import {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptions,
} from '@simplewebauthn/server';
import { AppService } from '../app.service.js';
import { ConfigService } from '@nestjs/config';
import { fromBase64URL } from '../encoding.js';

@Injectable()
export class AssertionService {
  constructor(
    private appService: AppService,
    private configService: ConfigService,
  ) {}
  async request(
    user: User,
    credId: string | undefined,
    options: PublicKeyCredentialRequestOptions,
  ) {
    const userVerification = options.userVerification || 'required';

    const allowCredentials = [];
    for (const cred of user.credentials) {
      // `credId` is specified and matches
      if (credId && cred.credId == credId) {
        allowCredentials.push({
          id: cred.credId,
          type: 'public-key',
        });
      }
    }

    return generateAuthenticationOptions({
      timeout: this.configService.get<number>('timeout'),
      rpID: this.configService.get<string>('hostname'),
      allowCredentials,
      /**
       * This optional value controls whether the authenticator needs to be able to uniquely
       * identify the user interacting with it (via built-in PIN pad, fingerprint scanner, etc...)
       */
      userVerification,
    });
  }

  async response(
    user: User,
    credential: AuthenticationResponseJSON,
    challenge: string,
    ua: string,
  ) {
    const expectedOrigin = this.appService.getOrigin(ua);
    const expectedRPID = this.configService.get('hostname');

    const userCredential = user.credentials.find(
      (cred) => cred.credId === credential.id,
    );

    if (!userCredential) {
      throw 'Authenticating credential not found.';
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID,
      credential: {
        publicKey: new Uint8Array(fromBase64URL(userCredential.publicKey)),
        counter: userCredential.prevCounter,
        id: userCredential.credId,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (!verified) {
      throw 'User verification failed.';
    }

    userCredential.prevCounter = authenticationInfo.newCounter;

    return user;
  }
}
