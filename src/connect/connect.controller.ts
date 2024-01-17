import {
  Body,
  Controller,
  Post,
  Session,
  Inject,
  Logger,
  Res,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { AlgorandEncoder } from './AlgoEncoder.js';

const algoEncoder = new AlgorandEncoder();

const base64ToUint8Array = (encoded) => {
  return new Uint8Array(
    atob(encoded)
      .split('')
      .map((c) => c.charCodeAt(0)),
  );
};
import nacl from 'tweetnacl';

type LinkResponseDTO = {
  credId?: string;
  requestId: string | number;
  wallet: string;
  challenge: string;
  signature: string;
};

@Controller('connect')
export class ConnectController {
  private readonly logger = new Logger(ConnectController.name);

  constructor(
    private authService: AuthService,
    @Inject('ACCOUNT_LINK_SERVICE') private client: ClientProxy,
  ) {}

  /**
   * Submit a response from a ConnectQR Scan
   * and login to service
   *
   * @param res
   * @param session
   * @param requestId
   * @param wallet
   */
  @Post('response')
  async linkWalletResponse(
    @Res() res: Response,
    @Session() session: Record<string, any>,
    @Body()
    { requestId, wallet, challenge, signature, credId }: LinkResponseDTO,
  ) {
    try {
      this.logger.log(
        `POST /connect/response for RequestId: ${requestId} Session: ${session.id} with Wallet: ${wallet}`,
      );
      // Decode Address
      const publicKey = algoEncoder.decodeAddress(wallet);

      // Decode signature
      const uint8Signature = base64ToUint8Array(
        signature.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''),
      );

      // Validate Signature
      const encoder = new TextEncoder();
      if (
        !nacl.sign.detached.verify(
          encoder.encode(challenge),
          uint8Signature,
          publicKey,
        )
      ) {
        return res
          .status(401)
          .json({
            error: 'Invalid signature',
          })
          .end();
      } else {
        this.logger.log('AUTH Wallet is attested');
        // Authenticated user
        await this.authService.init(wallet);

        const parsedRequest =
          typeof requestId === 'string' ? parseFloat(requestId) : requestId;
        console.log('Request Forwarding', parsedRequest);

        this.client.emit<string>('auth', {
          requestId,
          wallet,
          credId,
        });
        session.wallet = wallet;
        session.active = true;

        return res.status(200).end();
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}
