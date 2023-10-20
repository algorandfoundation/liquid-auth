import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from '../app.service.js';
import fido2 from '@simplewebauthn/server';
import { AttestationSelectorDto } from './attestation.dto';
import { User } from '../auth/auth.schema.js';
import type { AttestationCredentialJSON } from '@simplewebauthn/typescript-types';
@Injectable()
export class AttestationService {
  constructor(
    private appService: AppService,
    private configService: ConfigService,
  ) {}
  request(user: User, options: AttestationSelectorDto) {
    //https://www.iana.org/assignments/cose/cose.xhtml#algorithms
    // EdDSA is -8
    const pubKeyCredParams = [];
    // const params = [-7, -35, -36, -257, -258, -259, -37, -38, -39, -8];
    const params = [-7, -257];
    for (const param of params) {
      pubKeyCredParams.push({ type: 'public-key', alg: param });
    }
    // TOOD: Investigate fido2 simple server to breakdown what it is doing
    const attestationOptions = fido2.generateAttestationOptions({
      rpName: this.configService.get('rpName'),
      rpID: this.configService.get('hostname'),
      userID: user.id,
      userName: user.wallet,
      timeout: this.configService.get('timeout'),
      // Prompt users for additional information about the authenticator.
      attestationType: options.attestationType || 'none',
      // Prevent users from re-registering existing authenticators
      excludeCredentials: user.credentials.map((cred) => {
        return {
          id: cred.credId,
          type: 'public-key',
          transports: ['internal'],
        };
      }),
      // authenticatorSelection: options.authenticatorSelection,
    });

    // Temporary hack until SimpleWebAuthn supports `pubKeyCredParams`
    attestationOptions.pubKeyCredParams = [];
    for (const param of params) {
      attestationOptions.pubKeyCredParams.push({
        type: 'public-key',
        alg: param,
      });
    }
    return attestationOptions;
  }

  /**
   *
   * @param expectedChallenge - The challenge sent to the client
   * @param ua - The User-Agent header
   * @param credential - The credential sent from the client
   */
  async response(
    expectedChallenge: string,
    ua: string,
    credential: AttestationCredentialJSON,
  ) {
    const expectedOrigin = this.appService.getOrigin(ua);
    const expectedRPID = this.configService.get<string>('hostname');
    const verifiedAttestation = await fido2.verifyAttestationResponse({
      credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    });

    const { verified, authenticatorInfo } = verifiedAttestation;

    if (!verified) {
      throw 'User verification failed.';
    }

    return {
      publicKey: authenticatorInfo.base64PublicKey,
      credId: authenticatorInfo.base64CredentialID,
      prevCounter: authenticatorInfo.counter,
    };
  }
}
