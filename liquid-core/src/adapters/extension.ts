import { LiquidExtensionAdapter, StorageAdapter } from '../types.js';
import { fromBase64Url } from '../utils.js';
import nacl from 'tweetnacl';

export const DefaultLiquidExtensionAdapter: LiquidExtensionAdapter = {
  type: 'ed25519',
  verify: verifyLiquidSignature,
};

export async function verifyLiquidSignature(
  challenge: string,
  signature: string,
  address: string,
  storage: StorageAdapter,
) {
  try {
    const publicKeyBytes = fromBase64Url(address);
    const signatureBytes = fromBase64Url(signature);
    const challengeBytes = fromBase64Url(challenge);

    let valid = nacl.sign.detached.verify(
      challengeBytes,
      signatureBytes,
      publicKeyBytes,
    );

    if (!valid && storage.getAccountAuthAddress) {
      const authAddr = await storage.getAccountAuthAddress(address);
      if (authAddr) {
        const authPublicKey = fromBase64Url(authAddr);
        valid = nacl.sign.detached.verify(
          challengeBytes,
          signatureBytes,
          authPublicKey,
        );
      }
    }
    return valid;
  } catch (e) {
    return false;
  }
}
