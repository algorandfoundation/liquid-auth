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
import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Response } from 'express';
import { AuthService } from '../auth/auth.service.js';
type LinkResponseDTO = {
  requestId: string | number;
  wallet: string;
};

@Controller('connect')
export class ConnectController {
  private readonly logger = new Logger(ConnectController.name);

  @WebSocketServer()
  server: Server;
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
    @Body() { requestId, wallet }: LinkResponseDTO,
  ) {
    try {
      this.logger.log(
        `POST /connect/response for Request: ${requestId} Session: ${session.id} with Wallet: ${wallet}`,
      );
      const parsedRequest =
        typeof requestId === 'string' ? parseFloat(requestId) : requestId;
      // TODO: Have wallet challenge
      this.client.emit<string>('auth', { requestId: parsedRequest, wallet });
      session.wallet = wallet;
      session.active = true;

      await this.authService.init(wallet);

      res.status(200);
      res.end();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}
