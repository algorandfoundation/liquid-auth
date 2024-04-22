import { decodeAddress } from '@liquid/core/encoding';
import * as crypto from 'node:crypto';

export const accFixture = {
  challenge: crypto.randomBytes(32).toString('base64url'),
  accs: [
    {
      addr: 'B7WYCZ6HRBGCH452D24TYAK7BXKNCHEXY2X7S7FWZXMHDVTDOARAOURJEU',
      signature:
        'Pc3PGtQjXDIXKRBf8-W5VQT_UbxtYd2n8bzIlpITsZCvOujS17bGIKAd6Sy7_noyEgMxS0F_Vyhu39OYCANnAw',
    },
    {
      addr: 'TBIGPV7IOYCYOQP5K2NVDGOQIDNS7IPTIZV6YCMKON6NOI3ZZ6TOJPW3H4',
      signature:
        'bXvM2N-_KbaBxa3OirfOym5ei44CzdJaDPl9NNm3Jkbw9r3c7UBP8YCH84sbMje2Ctxpn36mz06jErZ-4Dh2Bw',
    },
    {
      addr: '6WSGFNM5SNL5RWKXFIKSKQGSLS63LJY4SEC73U2NVED6MTDX76RT4BELTA',
      signature:
        'OjoUX2fejtk4b25p0hlzWcZCwj0lJBAWVT5utF2tS-VE0zq9ohiZrBs2XWBjSE2ITCknnMvAAicrfvSCDs0VCw',
    },
  ],
};

export const dummyUsers = [
  {
    id: 0,
    wallet: accFixture.accs[0].addr,
    credentials: [
      {
        credId: 0,
        publicKey: decodeAddress(accFixture.accs[0].addr),
      },
    ],
  },
  {
    id: 1,
    wallet: accFixture.accs[1].addr,
    credentials: [],
  },
];

export const dummyOptions = {
  timeout: 0,
  rpID: 'meh',
  allowCredentials: [],
  userVerification: 'required',
};

export const dummyAttestationOptions = {
  challenge: crypto.randomBytes(32).toString('base64url'),
};
