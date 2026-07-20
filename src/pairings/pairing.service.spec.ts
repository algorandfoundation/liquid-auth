import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import {
  PairingInvitation,
  PairingInvitationSchema,
} from './pairing-invitation.schema.js';
import { Pairing } from './pairing.schema.js';
import {
  PairingAuthorizationError,
  PairingService,
} from './pairing.service.js';

type StoredDocument = Record<string, any>;

function matches(document: StoredDocument, query: StoredDocument): boolean {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') {
      return (expected as StoredDocument[]).some((candidate) =>
        matches(document, candidate),
      );
    }
    if (key === '$and') {
      return (expected as StoredDocument[]).every((candidate) =>
        matches(document, candidate),
      );
    }
    const actual = document[key];
    if (
      expected &&
      typeof expected === 'object' &&
      !(expected instanceof Date)
    ) {
      const operators = expected as StoredDocument;
      if (
        '$exists' in operators &&
        (actual !== undefined) !== operators.$exists
      ) {
        return false;
      }
      if ('$gt' in operators && !(actual > operators.$gt)) return false;
      return true;
    }
    return actual === expected;
  });
}

function queryResult<T>(result: T) {
  return { exec: jest.fn().mockResolvedValue(result) };
}

function applyUpdate(document: StoredDocument, update: StoredDocument): void {
  if ('$set' in update || '$unset' in update) {
    Object.assign(document, update.$set || {});
    for (const key of Object.keys(update.$unset || {})) delete document[key];
    return;
  }
  Object.assign(document, update);
}

describe('PairingService', () => {
  let invitations: StoredDocument[];
  let pairings: StoredDocument[];
  let invitationModel: any;
  let pairingModel: any;
  let service: PairingService;

  beforeEach(() => {
    invitations = [];
    pairings = [];

    invitationModel = jest.fn(function (
      this: StoredDocument,
      values: StoredDocument,
    ) {
      Object.assign(this, values);
      this.save = jest.fn(async () => {
        invitations.push(this);
        return this;
      });
    });
    invitationModel.findOne = jest.fn((query) =>
      queryResult(invitations.find((item) => matches(item, query)) || null),
    );
    invitationModel.findOneAndUpdate = jest.fn((query, update) => {
      const invitation = invitations.find((item) => matches(item, query));
      if (invitation) applyUpdate(invitation, update);
      return queryResult(invitation || null);
    });
    invitationModel.deleteOne = jest.fn((query) => {
      const index = invitations.findIndex((item) => matches(item, query));
      if (index >= 0) invitations.splice(index, 1);
      return queryResult({ deletedCount: index >= 0 ? 1 : 0 });
    });

    pairingModel = jest.fn(function (
      this: StoredDocument,
      values: StoredDocument,
    ) {
      Object.assign(this, values);
      this.save = jest.fn(async () => {
        pairings.push(this);
        return this;
      });
    });
    pairingModel.findOne = jest.fn((query) =>
      queryResult(pairings.find((item) => matches(item, query)) || null),
    );
    pairingModel.findOneAndUpdate = jest.fn((query, update) => {
      const pairing = pairings.find((item) => matches(item, query));
      if (pairing) applyUpdate(pairing, update);
      return queryResult(pairing || null);
    });

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'pairing.credentialSecret') return 'pairing-test-secret';
        if (key === 'pairing.invitationTtlSeconds') return 900;
        return undefined;
      }),
    } as unknown as ConfigService;
    service = new PairingService(
      invitationModel as Model<PairingInvitation>,
      pairingModel as Model<Pairing>,
      config,
    );
  });

  it('retains the deployed expiresAt TTL index used by legacy invitations', () => {
    expect(PairingInvitationSchema.indexes()).toContainEqual([
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    ]);
  });

  it('creates a pending invitation authenticated by an HMAC-stored provider credential', async () => {
    const result = await service.createInvitation('pairing-123456789');
    expect(result).toEqual({
      version: 2,
      pairingId: 'pairing-123456789',
      role: 'provider',
      credential: expect.any(String),
      expiresAt: expect.any(String),
    });
    expect(invitations[0].providerCredentialHash).not.toBe(result.credential);
    await expect(
      service.authenticateCredential(
        result.pairingId,
        'provider',
        result.credential,
      ),
    ).resolves.toMatchObject({ status: 'pending', role: 'provider' });
    await expect(
      service.authenticateCredential(
        result.pairingId,
        'provider',
        'wrong-credential',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('approves an invitation and authenticates both role-bound credentials', async () => {
    const provider = await service.createInvitation('pairing-123456789');
    const controller = await service.approveInvitation(
      provider.pairingId,
      'WALLET',
      'credential-id',
    );

    expect(controller).toMatchObject({
      version: 2,
      pairingId: provider.pairingId,
      role: 'controller',
      credential: expect.any(String),
    });
    await expect(
      service.authenticateCredential(
        provider.pairingId,
        'provider',
        provider.credential,
      ),
    ).resolves.toMatchObject({ status: 'active', wallet: 'WALLET' });
    await expect(
      service.authenticateCredential(
        controller.pairingId,
        'controller',
        controller.credential,
      ),
    ).resolves.toMatchObject({ status: 'active', wallet: 'WALLET' });
    await expect(
      service.authenticateCredential(
        controller.pairingId,
        'provider',
        controller.credential,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('allows a verified controller ceremony to recover after an approval response is lost', async () => {
    const provider = await service.createInvitation('pairing-123456789');
    await service.approveInvitation(
      provider.pairingId,
      'WALLET',
      'credential-id',
    );

    await expect(
      service.bindInvitation(provider.pairingId),
    ).resolves.toMatchObject({ pairingId: provider.pairingId });
    await expect(
      service.approveInvitation(provider.pairingId, 'WALLET', 'credential-id'),
    ).resolves.toMatchObject({
      version: 2,
      pairingId: provider.pairingId,
      role: 'controller',
      credential: expect.any(String),
    });
  });

  it('never allows an existing pairing to be rebound to a different wallet', async () => {
    const invitation = await service.createInvitation('pairing-123456789');
    await service.approveInvitation(
      invitation.pairingId,
      'FIRST_WALLET',
      'credential-id',
    );
    await expect(
      service.approveInvitation(
        invitation.pairingId,
        'SECOND_WALLET',
        'credential-id',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('revokes an active pairing for both roles and rejects later authentication', async () => {
    const provider = await service.createInvitation('pairing-123456789');
    await service.approveInvitation(
      provider.pairingId,
      'WALLET',
      'credential-id',
    );
    await expect(
      service.revoke(provider.pairingId, 'provider', provider.credential),
    ).resolves.toEqual({
      version: 2,
      pairingId: provider.pairingId,
      status: 'revoked',
    });
    await expect(
      service.authenticateCredential(
        provider.pairingId,
        'provider',
        provider.credential,
      ),
    ).rejects.toThrow('Pairing has been revoked');
    await expect(
      service.authenticateCredential(
        provider.pairingId,
        'provider',
        provider.credential,
        true,
      ),
    ).resolves.toMatchObject({ status: 'revoked' });
  });

  it('keeps an authenticated tombstone so pending revocation is idempotent', async () => {
    const provider = await service.createInvitation('pairing-123456789');

    await expect(
      service.revoke(provider.pairingId, 'provider', provider.credential),
    ).resolves.toEqual({
      version: 2,
      pairingId: provider.pairingId,
      status: 'revoked',
    });
    expect(invitations).toHaveLength(1);
    expect(invitations[0]).toMatchObject({
      pairingId: provider.pairingId,
      status: 'revoked',
      revokedAt: expect.any(Date),
      providerCredentialHash: expect.any(String),
    });
    expect(invitations[0].expiresAt).toBeUndefined();

    // A lost DELETE response can be retried with the original secret.
    await expect(
      service.revoke(provider.pairingId, 'provider', provider.credential),
    ).resolves.toMatchObject({ status: 'revoked' });
    await expect(
      service.authenticateCredential(
        provider.pairingId,
        'provider',
        provider.credential,
        true,
      ),
    ).resolves.toMatchObject({ status: 'revoked' });
  });

  it('does not authenticate arbitrary credentials against a pending-revocation tombstone', async () => {
    const provider = await service.createInvitation('pairing-123456789');
    await service.revoke(provider.pairingId, 'provider', provider.credential);

    await expect(
      service.revoke(provider.pairingId, 'provider', 'wrong-credential'),
    ).rejects.toMatchObject({ code: 'PAIRING_UNAUTHORIZED' });
    await expect(
      service.authenticateCredential(
        provider.pairingId,
        'provider',
        provider.credential,
      ),
    ).rejects.toMatchObject({ code: 'PAIRING_REVOKED' });
  });

  it('never reuses or approves a revoked invitation id', async () => {
    const provider = await service.createInvitation('pairing-123456789');
    await service.revoke(provider.pairingId, 'provider', provider.credential);

    await expect(service.bindInvitation(provider.pairingId)).rejects.toThrow(
      'Pairing invitation not found or expired',
    );
    await expect(
      service.approveInvitation(provider.pairingId, 'WALLET', 'credential-id'),
    ).rejects.toThrow('Pairing invitation not found or expired');
    await expect(service.createInvitation(provider.pairingId)).rejects.toThrow(
      'Pairing id has been revoked',
    );
  });

  it('classifies an invitation-to-pairing hand-off as transient', async () => {
    const provider = await service.createInvitation('pairing-123456789');
    invitations[0].status = 'consumed';

    const authentication = service.authenticateCredential(
      provider.pairingId,
      'provider',
      provider.credential,
    );
    await expect(authentication).rejects.toThrow(
      'Pairing approval is still being finalized',
    );
    await expect(authentication).rejects.not.toBeInstanceOf(
      PairingAuthorizationError,
    );
    await expect(service.createInvitation(provider.pairingId)).rejects.toThrow(
      'Pairing id is already in use',
    );
  });

  it('supports legacy invitations without a status field', async () => {
    const provider = await service.createInvitation('pairing-123456789');
    delete invitations[0].status;

    await expect(
      service.bindInvitation(provider.pairingId),
    ).resolves.toMatchObject({ pairingId: provider.pairingId });
    await expect(
      service.revoke(provider.pairingId, 'provider', provider.credential),
    ).resolves.toMatchObject({ status: 'revoked' });
    expect(invitations[0]).toMatchObject({
      status: 'revoked',
      revokedAt: expect.any(Date),
    });
    expect(invitations[0].expiresAt).toBeUndefined();
  });

  it('does not mistake a consumed invitation with stale pending status for pending', async () => {
    const provider = await service.createInvitation('pairing-123456789');
    invitations[0].consumedAt = new Date();

    await expect(service.bindInvitation(provider.pairingId)).rejects.toThrow(
      'Pairing invitation not found or expired',
    );
    await expect(service.createInvitation(provider.pairingId)).rejects.toThrow(
      'Pairing id is already in use',
    );
  });
});
