import { Injectable } from '@nestjs/common';
import * as fido2 from '@simplewebauthn/server';
import { User } from '../auth/auth.schema.js';
import {
  AssertionCredentialJSON,
  AuthenticatorDevice,
  PublicKeyCredentialRequestOptions,
} from '@simplewebauthn/typescript-types';
import { AppService } from '../app.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AssertionService {
  constructor(
    private appService: AppService,
    private configService: ConfigService,
  ) {}
  request(
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

    return fido2.generateAssertionOptions({
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

  response(
    user: User,
    credential: AssertionCredentialJSON,
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

    const verification = fido2.verifyAssertionResponse({
      credential,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID,
      authenticator: userCredential as unknown as AuthenticatorDevice,
    });

    const { verified, authenticatorInfo } = verification;

    if (!verified) {
      throw 'User verification failed.';
    }

    userCredential.prevCounter = authenticatorInfo.counter;

    return user;
  }
}
