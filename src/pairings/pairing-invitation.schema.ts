import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PairingInvitationDocument = HydratedDocument<PairingInvitation>;
export type PairingInvitationStatus = 'pending' | 'consumed' | 'revoked';

@Schema({ timestamps: true })
export class PairingInvitation {
  @Prop({ required: true, unique: true, index: true })
  pairingId: string;

  @Prop({ required: true, unique: true, index: true })
  requestId: string;

  @Prop({ required: true })
  providerCredentialHash: string;

  /**
   * Pending/consumed invitations expire through this TTL field. Revocation
   * unsets it so the authenticated tombstone is retained indefinitely.
   */
  @Prop({ index: { expireAfterSeconds: 0 } })
  expiresAt?: Date;

  @Prop({
    enum: ['pending', 'consumed', 'revoked'],
  })
  status?: PairingInvitationStatus;

  @Prop()
  consumedAt?: Date;

  @Prop()
  revokedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PairingInvitationSchema =
  SchemaFactory.createForClass(PairingInvitation);
