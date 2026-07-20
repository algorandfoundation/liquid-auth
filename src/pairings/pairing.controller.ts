import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PairingRole } from './pairing.schema.js';
import { PairingService } from './pairing.service.js';

@Controller('pairings')
@ApiTags('pairings')
export class PairingController {
  constructor(
    private readonly pairingService: PairingService,
    @Inject('ACCOUNT_LINK_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post('/invitations')
  @ApiOperation({ summary: 'Create a durable pairing invitation' })
  async createInvitation(@Body() body: { requestId?: string } = {}) {
    return this.pairingService.createInvitation(body?.requestId);
  }

  @Get('/:pairingId/status')
  @ApiOperation({ summary: 'Read durable pairing status' })
  async status(
    @Param('pairingId') pairingId: string,
    @Headers('authorization') authorization: string,
    @Headers('x-pairing-role') roleHeader: string,
  ) {
    const { credential, role } = this.readCredentials(
      authorization,
      roleHeader,
    );
    return this.pairingService.authenticateCredential(
      pairingId,
      role,
      credential,
      true,
    );
  }

  @Delete('/:pairingId')
  @ApiOperation({ summary: 'Revoke a durable pairing' })
  async revoke(
    @Param('pairingId') pairingId: string,
    @Headers('authorization') authorization: string,
    @Headers('x-pairing-role') roleHeader: string,
  ) {
    const { credential, role } = this.readCredentials(
      authorization,
      roleHeader,
    );
    const result = await this.pairingService.revoke(
      pairingId,
      role,
      credential,
    );
    this.client.emit<string>('auth', {
      type: 'pairing:revoked',
      ...result,
    });
    return result;
  }

  private readCredentials(
    authorization: string,
    roleHeader: string,
  ): { credential: string; role: PairingRole } {
    const match = /^Bearer\s+(.+)$/i.exec(authorization || '');
    if (!match || (roleHeader !== 'provider' && roleHeader !== 'controller')) {
      throw new UnauthorizedException('Pairing credentials are required');
    }
    return { credential: match[1], role: roleHeader };
  }
}
