import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from '../app.service.js';
import {
  generateRegistrationOptions,
  RegistrationResponseJSON,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { AttestationSelectorDto } from './attestation.dto.js';
import {
  decodeAddress,
  fromBase64URL,
  toBase64URL,
} from '../encoding.js';
import nacl from 'tweetnacl';
import { AlgodService } from '../algod/algod.service.js';
@Injectable()
export class AttestationService {
  encoder: TextEncoder = new TextEncoder();
  constructor(
    private appService: AppService,
    private algodService: AlgodService,
    private configService: ConfigService,
  ) {}
  async verify(
    algod: AlgodService,
    type: string,
    challenge: string,
    signature: string,
    address: string,
  ) {
    if (type === 'algorand') {
      // Decode
      const publicKeyBytes = decodeAddress(address);
      const signatureBytes = fromBase64URL(signature);
      const challengeBytes = fromBase64URL(challenge);
      const valid = nacl.sign.detached.verify(
        challengeBytes,
        signatureBytes,
        publicKeyBytes,
      );
      if (valid) return true;
      if (!valid) {
        // signature check failed, check if its rekeyed
        // if it is, verify against that public key instead
        const accountInfo = await algod
          .accountInformation(address)
          .exclude('all')
          .do();

        if (!accountInfo['auth-addr']) {
          return false;
        }

        const authPublicKey = decodeAddress(accountInfo['auth-addr']);

        // Validate Auth Address Signature
        return nacl.sign.detached.verify(
          challengeBytes,
          signatureBytes,
          authPublicKey,
        );
      }
    }
    return false;
  }
  async request(options: AttestationSelectorDto) {
    //https://www.iana.org/assignments/cose/cose.xhtml#algorithms
    // EdDSA is -8
    // const params = [-7, -35, -36, -257, -258, -259, -37, -38, -39, -8];
    const _options = await generateRegistrationOptions({
      rpName: this.configService.get('rpName'),
      rpID: this.configService.get('hostname'),
      userName: options.username,
      userDisplayName: options.username,
      timeout: this.configService.get('timeout'),
      extensions: options.extensions,
      supportedAlgorithmIDs: [-7, -257],
      authenticatorSelection: {
        // residentKey: 'preferred',
        userVerification: 'required',
      },
    });
    // Patch the options to match v1
    _options.user.id = options.username;
    delete _options.extensions.credProps;
    delete _options.hints;
    return _options;
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
    credential: RegistrationResponseJSON & {
      clientExtensionResults?: {
        liquid: {
          type: string;
          signature: string;
          address: string;
          device?: string;
        };
      };
    },
  ) {
    const expectedOrigin = this.appService.getOrigin(ua);
    const expectedRPID = this.configService.get<string>('hostname');

    // Validate the passkey
    const verifiedAttestation = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    });
    const { registrationInfo } = verifiedAttestation;
    let { verified } = verifiedAttestation;

    // Handle Liquid Extension
    const isLiquid =
      typeof credential.clientExtensionResults !== 'undefined' &&
      typeof credential.clientExtensionResults.liquid !== 'undefined';
    // Check for extension results
    if (isLiquid && verified) {
      // Verify the signature
      verified = await this.verify(
        this.algodService,
        credential.clientExtensionResults.liquid.type,
        expectedChallenge,
        credential.clientExtensionResults.liquid.signature,
        credential.clientExtensionResults.liquid.address,
      );
    }

    if (!verified) {
      throw 'User verification failed.';
    }

    return {
      device:
        credential?.clientExtensionResults?.liquid?.device || 'Unknown Device',
      publicKey: toBase64URL(registrationInfo.credential.publicKey),
      credId: registrationInfo.credential.id,
      prevCounter: registrationInfo.credential.counter,
    };
  }
}
