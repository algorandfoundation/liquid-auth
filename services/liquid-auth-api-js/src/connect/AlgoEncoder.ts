import { sha512_256 } from 'js-sha512';
import * as base32 from 'hi-base32';

const ALGORAND_PUBLIC_KEY_BYTE_LENGTH = 32;
const ALGORAND_ADDRESS_BYTE_LENGTH = 36;
const ALGORAND_CHECKSUM_BYTE_LENGTH = 4;
const ALGORAND_ADDRESS_LENGTH = 58;
const HASH_BYTES_LENGTH = 32;
export const MALFORMED_ADDRESS_ERROR_MSG = 'Malformed address';
export const ALGORAND_ADDRESS_BAD_CHECKSUM_ERROR_MSG = 'Bad checksum';

export class AlgorandEncoder {
  /**
   * decodeAddress takes an Algorand address in string form and decodes it into a Uint8Array.
   * @param address - an Algorand address with checksum.
   * @returns the decoded form of the address's public key and checksum
   */
  decodeAddress(address: string): Uint8Array {
    if (
      typeof address !== 'string' ||
      address.length !== ALGORAND_ADDRESS_LENGTH
    )
      throw new Error(MALFORMED_ADDRESS_ERROR_MSG);

    // try to decode
    const decoded = base32.decode.asBytes(address.toString());

    // Find publickey and checksum
    const pk = new Uint8Array(
      decoded.slice(
        0,
        ALGORAND_ADDRESS_BYTE_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH,
      ),
    );
    const cs = new Uint8Array(
      decoded.slice(
        ALGORAND_PUBLIC_KEY_BYTE_LENGTH,
        ALGORAND_ADDRESS_BYTE_LENGTH,
      ),
    );

    // Compute checksum
    const checksum = sha512_256
      .array(pk)
      .slice(
        HASH_BYTES_LENGTH - ALGORAND_CHECKSUM_BYTE_LENGTH,
        HASH_BYTES_LENGTH,
      );

    // Check if the checksum and the address are equal
    if (
      checksum.length !== cs.length ||
      !Array.from(checksum).every((val, i) => val === cs[i])
    ) {
      throw new Error(ALGORAND_ADDRESS_BAD_CHECKSUM_ERROR_MSG);
    }

    return pk;
  }
}
