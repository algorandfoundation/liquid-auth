import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from '../app.service.js';
import fido2 from '@simplewebauthn/server';
import { AttestationSelectorDto } from './attestation.dto.js';
import { User } from '../auth/auth.schema.js';
import type { AttestationCredentialJSON } from '@simplewebauthn/typescript-types';
import { base64ToUint8Array, decodeAddress, fromBase64Url } from "@liquid/core";
import nacl from "tweetnacl";
@Injectable()
export class AttestationService {
  constructor(
    private appService: AppService,
    private configService: ConfigService,
  ) {}
  verify(type: string, challenge: string, signature: string, address: string) {
    if(type === 'algorand'){
      // Decode
      const publicKeyBytes = decodeAddress(address);
      const signatureBytes = fromBase64Url(signature);
      const challengeBytes = fromBase64Url(challenge);

      return nacl.sign.detached.verify(challengeBytes, signatureBytes, publicKeyBytes)
    }

    return false;
  }
  request(options: AttestationSelectorDto, user?: User) {
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
      ...options,
      rpName: this.configService.get('rpName'),
      rpID: this.configService.get('hostname'),
      userID: options.username,
      userName:options.username,
      timeout: this.configService.get('timeout'),
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
    credential: AttestationCredentialJSON & { clientExtensionResults?: { liquid: { type: string, signature: string, address: string, device?: string } } },
  ) {
    const expectedOrigin = this.appService.getOrigin(ua);
    const expectedRPID = this.configService.get<string>('hostname');

    // Validate the passkey
    const verifiedAttestation = await fido2.verifyAttestationResponse({
      credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    });
    let { verified, authenticatorInfo } = verifiedAttestation;

    // Handle Liquid Extension
    const isLiquid = typeof credential.clientExtensionResults !== 'undefined' && typeof credential.clientExtensionResults.liquid !== 'undefined'
    let liquid = isLiquid ? credential.clientExtensionResults.liquid : undefined;
    // Check for extension results
    if(isLiquid && verified){
      console.log(credential.clientExtensionResults.liquid, expectedChallenge)
      // Verify the signature
      verified = this.verify(
        credential.clientExtensionResults.liquid.type,
        expectedChallenge,
        credential.clientExtensionResults.liquid.signature,
        credential.clientExtensionResults.liquid.address
      );
    }

    if (!verified) {
      throw 'User verification failed.';
    }

    return {
      device: credential?.clientExtensionResults?.liquid?.device || 'Unknown Device',
      publicKey: authenticatorInfo.base64PublicKey,
      credId: authenticatorInfo.base64CredentialID,
      prevCounter: authenticatorInfo.counter,
      liquid
    };
  }
}
