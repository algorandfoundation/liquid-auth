import {
  Body,
  Controller,
  Post,
  Session,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthService } from '../auth/auth.service.js';
import { AlgodService } from '../algod/algod.service.js';
import nacl from 'tweetnacl';
import { decodeAddress, fromBase64Url } from '@liquid/core/encoding';
import { ApiBody, ApiOkResponse, ApiOperation, ApiProperty } from "@nestjs/swagger";

type LinkResponseDTOType = {
  credId?: string;
  requestId?: string | number;
  wallet: string;
  challenge: string;
  signature: string;
};

class LinkResponseDTO implements LinkResponseDTOType {
  @ApiProperty()
  credId?: string;
  @ApiProperty()
  requestId?: string | number;
  @ApiProperty()
  wallet: string;
  @ApiProperty()
  challenge: string;
  @ApiProperty()
  signature: string;
}

@Controller('connect')
export class ConnectController {
  private readonly logger = new Logger(ConnectController.name);

  constructor(
    private authService: AuthService,
    private algodService: AlgodService,
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
   * @deprecated
   */
  @Post('response')
  @ApiOperation({
    description: `
# Yo yo
Can I get a decend documentation out of here?
    `,
    summary: 'Submit a response from a ConnectQR Scan and login to service'
  })
  @ApiBody({ type: LinkResponseDTO })
  @ApiOkResponse({ description: 'Successfully attested public key' })
  async linkWalletResponse(
    @Session() session: Record<string, any>,
    @Body()
    { requestId, wallet, challenge, signature, credId }: LinkResponseDTO,
  ) {
    this.logger.log(
      `POST /connect/response for RequestId: ${requestId} Session: ${session.id} with Wallet: ${wallet}`,
    );
    // Decode Address
    const publicKey = decodeAddress(wallet);

    // Decode signature
    const uint8Signature = fromBase64Url(signature);

    // Validate Signature
    const encoder = new TextEncoder();
    const encodedChallenge = encoder.encode(challenge);

    if (
      !nacl.sign.detached.verify(encodedChallenge, uint8Signature, publicKey)
    ) {
      // signature check failed, check if its rekeyed
      // if it is, verify against that public key instead
      let accountInfo;
      try {
        accountInfo = await this.algodService
          .accountInformation(wallet)
          .exclude('all')
          .do();
      } catch (e) {
        throw new HttpException(
          'Failed to fetch Account Info',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (!accountInfo['auth-addr']) {
        throw new HttpException('Invalid signature', HttpStatus.FORBIDDEN);
      }

      const authPublicKey = decodeAddress(accountInfo['auth-addr']);

      // Validate Auth Address Signature
      if (
        !nacl.sign.detached.verify(
          encodedChallenge,
          uint8Signature,
          authPublicKey,
        )
      ) {
        throw new HttpException('Invalid signature', HttpStatus.FORBIDDEN);
      }
    }

    this.logger.log('AUTH Wallet is attested');
    // Authenticated user
    try {
      await this.authService.init(wallet);
    } catch (e) {
      throw new HttpException(
        'Failed to initialize wallet',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const parsedRequest =
      typeof requestId === 'string' ? parseFloat(requestId) : requestId;

    console.log('Request Forwarding', parsedRequest);

    session.wallet = wallet;
    session.active = true;

    this.client.emit<string>('auth', {
      requestId,
      wallet,
      credId,
    });

    return;
  }
}
