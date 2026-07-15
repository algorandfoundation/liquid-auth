import { UnauthorizedException } from '@nestjs/common';
import { PairingController } from './pairing.controller.js';
import { PairingService } from './pairing.service.js';
import { ClientProxy } from '@nestjs/microservices';

describe('PairingController', () => {
  const pairingService = {
    createInvitation: jest.fn(),
    authenticateCredential: jest.fn(),
    revoke: jest.fn(),
  } as unknown as PairingService;
  const accountLinkService = {
    emit: jest.fn(),
  } as unknown as ClientProxy;
  const controller = new PairingController(pairingService, accountLinkService);

  beforeEach(() => jest.clearAllMocks());

  it('creates an invitation with an optional caller request id', async () => {
    const invitation = {
      version: 2,
      pairingId: 'pairing-123456789',
      role: 'provider',
      credential: 'provider-credential',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    (pairingService.createInvitation as jest.Mock).mockResolvedValue(
      invitation,
    );

    await expect(
      controller.createInvitation({ requestId: invitation.pairingId }),
    ).resolves.toEqual(invitation);
    expect(pairingService.createInvitation).toHaveBeenCalledWith(
      invitation.pairingId,
    );
  });

  it('authenticates status requests with a role-bound bearer credential', async () => {
    (pairingService.authenticateCredential as jest.Mock).mockResolvedValue({
      version: 2,
      pairingId: 'pairing-123456789',
      role: 'provider',
      status: 'active',
      wallet: 'WALLET',
    });

    await controller.status(
      'pairing-123456789',
      'Bearer provider-credential',
      'provider',
    );
    expect(pairingService.authenticateCredential).toHaveBeenCalledWith(
      'pairing-123456789',
      'provider',
      'provider-credential',
      true,
    );
  });

  it('rejects missing or invalid role-bound credentials', async () => {
    await expect(
      controller.status('pairing-123456789', '', 'provider'),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      controller.revoke(
        'pairing-123456789',
        'Bearer provider-credential',
        'unexpected-role',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('allows either paired role to revoke with its own credential', async () => {
    (pairingService.revoke as jest.Mock).mockResolvedValue({
      version: 2,
      pairingId: 'pairing-123456789',
      status: 'revoked',
    });
    await controller.revoke(
      'pairing-123456789',
      'Bearer controller-credential',
      'controller',
    );
    expect(pairingService.revoke).toHaveBeenCalledWith(
      'pairing-123456789',
      'controller',
      'controller-credential',
    );
    expect(accountLinkService.emit).toHaveBeenCalledWith('auth', {
      type: 'pairing:revoked',
      version: 2,
      pairingId: 'pairing-123456789',
      status: 'revoked',
    });
  });

  it('rebroadcasts an idempotent revocation retry', async () => {
    (pairingService.revoke as jest.Mock).mockResolvedValue({
      version: 2,
      pairingId: 'pairing-123456789',
      status: 'revoked',
    });

    await controller.revoke(
      'pairing-123456789',
      'Bearer provider-credential',
      'provider',
    );
    await controller.revoke(
      'pairing-123456789',
      'Bearer provider-credential',
      'provider',
    );

    expect(pairingService.revoke).toHaveBeenCalledTimes(2);
    expect(accountLinkService.emit).toHaveBeenCalledTimes(2);
  });
});
