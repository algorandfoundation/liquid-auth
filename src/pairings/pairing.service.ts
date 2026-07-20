import * as crypto from 'node:crypto';
import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PairingInvitation,
  PairingInvitationDocument,
} from './pairing-invitation.schema.js';
import {
  Pairing,
  PairingDocument,
  PairingRole,
  PairingStatus,
} from './pairing.schema.js';

export type PairingCredential = {
  version: 2;
  pairingId: string;
  role: PairingRole;
  credential: string;
};

export type PairingInvitationResult = PairingCredential & {
  role: 'provider';
  expiresAt: string;
};

export type PairingApprovalResult = PairingCredential & {
  role: 'controller';
};

export type PairingAuthentication = {
  version: 2;
  pairingId: string;
  role: PairingRole;
  status: PairingStatus | 'pending';
  wallet?: string;
};

export type PairingAuthorizationErrorCode =
  | 'PAIRING_UNAUTHORIZED'
  | 'PAIRING_REVOKED';

/** A terminal pairing-auth failure that signaling clients must not retry. */
export class PairingAuthorizationError extends UnauthorizedException {
  constructor(
    readonly code: PairingAuthorizationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

@Injectable()
export class PairingService {
  private readonly credentialSecret: string;
  private readonly invitationTtlSeconds: number;

  constructor(
    @InjectModel(PairingInvitation.name)
    private readonly invitationModel: Model<PairingInvitation>,
    @InjectModel(Pairing.name)
    private readonly pairingModel: Model<Pairing>,
    private readonly configService: ConfigService,
  ) {
    this.credentialSecret =
      this.configService.get<string>('pairing.credentialSecret') ||
      this.configService.get<string>('session.secret') ||
      'secret';
    this.invitationTtlSeconds =
      this.configService.get<number>('pairing.invitationTtlSeconds') || 900;
  }

  async createInvitation(requestId?: string): Promise<PairingInvitationResult> {
    const pairingId = requestId?.trim() || crypto.randomUUID();
    if (!this.isValidPublicId(pairingId)) {
      throw new ConflictException('Invalid pairing id');
    }

    const existingPairing = await this.pairingModel
      .findOne({ pairingId })
      .exec();
    if (existingPairing) {
      throw new ConflictException('Pairing id is already in use');
    }

    const now = new Date();
    const existingInvitation = await this.invitationModel
      .findOne({ pairingId })
      .exec();
    const existingStatus = this.invitationStatus(existingInvitation);
    if (existingStatus === 'revoked') {
      throw new ConflictException('Pairing id has been revoked');
    }
    if (existingStatus === 'consumed') {
      throw new ConflictException('Pairing id is already in use');
    }
    if (
      existingInvitation &&
      existingStatus === 'pending' &&
      existingInvitation.expiresAt &&
      existingInvitation.expiresAt > now
    ) {
      throw new ConflictException('Pairing invitation already exists');
    }
    if (existingInvitation) {
      await this.invitationModel.deleteOne({ pairingId }).exec();
    }

    const credential = this.generateCredential();
    const expiresAt = new Date(
      now.getTime() + this.invitationTtlSeconds * 1000,
    );
    const invitation = new this.invitationModel({
      pairingId,
      requestId: pairingId,
      providerCredentialHash: this.hashCredential(credential),
      expiresAt,
      status: 'pending',
    });

    try {
      await invitation.save();
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        throw new ConflictException('Pairing id is already in use');
      }
      throw error;
    }

    return {
      version: 2,
      pairingId,
      role: 'provider',
      credential,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async bindInvitation(
    requestId: string,
  ): Promise<Pick<PairingInvitationDocument, 'pairingId'>> {
    const invitation = await this.invitationModel
      .findOne({
        $and: [
          { $or: [{ pairingId: requestId }, { requestId }] },
          this.pendingInvitationStateFilter(),
        ],
        expiresAt: { $gt: new Date() },
      })
      .exec();
    if (invitation) return invitation as PairingInvitationDocument;

    // Approval is intentionally retryable. The first WebAuthn response may
    // commit the pairing while its HTTP response is lost; allowing the same
    // public id to bind again lets a subsequent, independently verified
    // ceremony return a fresh controller credential. `approveInvitation()`
    // still requires the proven wallet to match the stored pairing and refuses
    // revoked records, so this does not let a public pairing id rebind an agent.
    const activePairing = await this.pairingModel
      .findOne({ pairingId: requestId, status: 'active' })
      .exec();
    if (activePairing) return { pairingId: activePairing.pairingId };

    throw new NotFoundException('Pairing invitation not found or expired');
  }

  async approveInvitation(
    requestId: string,
    wallet: string,
    approvingCredentialId: string,
  ): Promise<PairingApprovalResult> {
    const existing = await this.pairingModel
      .findOne({ pairingId: requestId })
      .exec();
    if (existing) {
      return this.refreshControllerCredential(
        existing,
        wallet,
        approvingCredentialId,
      );
    }

    const now = new Date();
    const invitation = await this.invitationModel
      .findOneAndUpdate(
        {
          $and: [
            { $or: [{ pairingId: requestId }, { requestId }] },
            this.pendingInvitationStateFilter(),
          ],
          expiresAt: { $gt: now },
        },
        { status: 'consumed', consumedAt: now },
        { new: true },
      )
      .exec();
    if (!invitation) {
      const racedPairing = await this.pairingModel
        .findOne({ pairingId: requestId })
        .exec();
      if (racedPairing) {
        return this.refreshControllerCredential(
          racedPairing,
          wallet,
          approvingCredentialId,
        );
      }
      throw new NotFoundException('Pairing invitation not found or expired');
    }

    const credential = this.generateCredential();
    const pairing = new this.pairingModel({
      pairingId: invitation.pairingId,
      wallet,
      providerCredentialHash: invitation.providerCredentialHash,
      controllerCredentialHash: this.hashCredential(credential),
      status: 'active',
      approvingCredentialId,
    });

    try {
      await pairing.save();
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      const racedPairing = await this.pairingModel
        .findOne({ pairingId: invitation.pairingId })
        .exec();
      if (!racedPairing) throw error;
      return this.refreshControllerCredential(
        racedPairing,
        wallet,
        approvingCredentialId,
      );
    }

    return {
      version: 2,
      pairingId: invitation.pairingId,
      role: 'controller',
      credential,
    };
  }

  async findActivePairing(pairingId: string): Promise<PairingDocument | null> {
    return this.pairingModel
      .findOne({ pairingId, status: 'active' })
      .exec() as Promise<PairingDocument | null>;
  }

  async authenticateCredential(
    pairingId: string,
    role: PairingRole,
    credential: string,
    allowRevoked = false,
  ): Promise<PairingAuthentication> {
    if (
      !pairingId ||
      !credential ||
      (role !== 'provider' && role !== 'controller')
    ) {
      throw new PairingAuthorizationError(
        'PAIRING_UNAUTHORIZED',
        'Invalid pairing credentials',
      );
    }

    const pairing = await this.pairingModel.findOne({ pairingId }).exec();
    if (pairing) {
      const expectedHash =
        role === 'provider'
          ? pairing.providerCredentialHash
          : pairing.controllerCredentialHash;
      if (!this.credentialMatches(credential, expectedHash)) {
        throw new PairingAuthorizationError(
          'PAIRING_UNAUTHORIZED',
          'Invalid pairing credentials',
        );
      }
      if (pairing.status === 'revoked' && !allowRevoked) {
        throw new PairingAuthorizationError(
          'PAIRING_REVOKED',
          'Pairing has been revoked',
        );
      }
      return {
        version: 2,
        pairingId,
        role,
        status: pairing.status,
        wallet: pairing.wallet,
      };
    }

    if (role === 'provider') {
      const invitation = await this.invitationModel
        .findOne({ pairingId })
        .exec();
      if (
        invitation &&
        this.credentialMatches(credential, invitation.providerCredentialHash)
      ) {
        const invitationStatus = this.invitationStatus(invitation);
        if (invitationStatus === 'revoked') {
          if (!allowRevoked) {
            throw new PairingAuthorizationError(
              'PAIRING_REVOKED',
              'Pairing has been revoked',
            );
          }
          return { version: 2, pairingId, role, status: 'revoked' };
        }
        if (
          invitationStatus === 'pending' &&
          invitation.expiresAt &&
          invitation.expiresAt > new Date()
        ) {
          return { version: 2, pairingId, role, status: 'pending' };
        }
        if (invitationStatus === 'consumed') {
          // The invitation is claimed before its durable pairing is inserted.
          // Treat that small hand-off window as transient, never as a terminal
          // credential failure that would make a client discard the pairing.
          throw new Error('Pairing approval is still being finalized');
        }
      }
    }

    throw new PairingAuthorizationError(
      'PAIRING_UNAUTHORIZED',
      'Invalid pairing credentials',
    );
  }

  async revoke(
    pairingId: string,
    role: PairingRole,
    credential: string,
  ): Promise<{ version: 2; pairingId: string; status: 'revoked' }> {
    const authentication = await this.authenticateCredential(
      pairingId,
      role,
      credential,
      true,
    );
    if (authentication.status === 'pending') {
      const revokedAt = new Date();
      const invitation = await this.invitationModel
        .findOneAndUpdate(
          {
            pairingId,
            providerCredentialHash: this.hashCredential(credential),
            ...this.pendingInvitationStateFilter(),
          },
          {
            $set: { status: 'revoked', revokedAt },
            // Preserve the deployed expiresAt TTL index. MongoDB ignores a
            // missing TTL field, so the credential-authenticated tombstone is
            // permanent without an index migration or an expiry race.
            $unset: { expiresAt: 1 },
          },
          { new: true },
        )
        .exec();
      if (!invitation) {
        // Approval or another revoke won the compare-and-set. Re-authenticate
        // so we either revoke the active record, accept its tombstone, or ask
        // the caller to retry while approval finishes.
        const raced = await this.authenticateCredential(
          pairingId,
          role,
          credential,
          true,
        );
        if (raced.status === 'active') {
          await this.revokeActivePairing(pairingId);
        } else if (raced.status !== 'revoked') {
          throw new Error('Pairing state changed while it was being revoked');
        }
      }
    } else if (authentication.status !== 'revoked') {
      await this.revokeActivePairing(pairingId);
    }
    return { version: 2, pairingId, status: 'revoked' };
  }

  private async revokeActivePairing(pairingId: string): Promise<void> {
    const pairing = await this.pairingModel
      .findOneAndUpdate(
        { pairingId, status: 'active' },
        { status: 'revoked', revokedAt: new Date() },
        { new: true },
      )
      .exec();
    if (pairing) return;

    const current = await this.pairingModel.findOne({ pairingId }).exec();
    if (current?.status === 'revoked') return;
    throw new Error('Pairing state changed while it was being revoked');
  }

  private async refreshControllerCredential(
    pairing: Pairing,
    wallet: string,
    approvingCredentialId: string,
  ): Promise<PairingApprovalResult> {
    if (pairing.wallet !== wallet) {
      throw new ConflictException('Pairing is already bound to another wallet');
    }
    if (pairing.status === 'revoked') {
      throw new GoneException('Pairing has been revoked');
    }
    const credential = this.generateCredential();
    const updated = await this.pairingModel
      .findOneAndUpdate(
        { pairingId: pairing.pairingId, wallet, status: 'active' },
        {
          controllerCredentialHash: this.hashCredential(credential),
          approvingCredentialId,
        },
        { new: true },
      )
      .exec();
    if (!updated) {
      const current = await this.pairingModel
        .findOne({ pairingId: pairing.pairingId })
        .exec();
      if (current?.status === 'revoked') {
        throw new GoneException('Pairing has been revoked');
      }
      throw new ConflictException('Pairing could not be refreshed');
    }
    return {
      version: 2,
      pairingId: pairing.pairingId,
      role: 'controller',
      credential,
    };
  }

  private generateCredential(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private pendingInvitationStateFilter(): Record<string, unknown> {
    return {
      $or: [
        {
          status: 'pending',
          consumedAt: { $exists: false },
          revokedAt: { $exists: false },
        },
        {
          status: { $exists: false },
          consumedAt: { $exists: false },
          revokedAt: { $exists: false },
        },
      ],
    };
  }

  private invitationStatus(
    invitation: Pick<
      PairingInvitation,
      'status' | 'consumedAt' | 'revokedAt'
    > | null,
  ): 'pending' | 'consumed' | 'revoked' | undefined {
    if (!invitation) return undefined;
    if (invitation.revokedAt) return 'revoked';
    if (invitation.consumedAt) return 'consumed';
    if (invitation.status) return invitation.status;
    return 'pending';
  }

  private hashCredential(credential: string): string {
    return crypto
      .createHmac('sha256', this.credentialSecret)
      .update(credential)
      .digest('base64url');
  }

  private credentialMatches(credential: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashCredential(credential));
    const expected = Buffer.from(expectedHash || '');
    return (
      actual.length === expected.length &&
      crypto.timingSafeEqual(actual, expected)
    );
  }

  private isValidPublicId(value: string): boolean {
    return (
      value.length >= 16 &&
      value.length <= 256 &&
      /^[a-zA-Z0-9_-]+$/.test(value)
    );
  }
}
