import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PairingRole = 'provider' | 'controller';
export type PairingStatus = 'active' | 'revoked';
export type PairingDocument = HydratedDocument<Pairing>;

@Schema({ timestamps: true })
export class Pairing {
  @Prop({ required: true, unique: true, index: true })
  pairingId: string;

  @Prop({ required: true, index: true })
  wallet: string;

  @Prop({ required: true })
  providerCredentialHash: string;

  @Prop({ required: true })
  controllerCredentialHash: string;

  @Prop({ required: true, enum: ['active', 'revoked'], default: 'active' })
  status: PairingStatus;

  @Prop({ required: true })
  approvingCredentialId: string;

  @Prop()
  revokedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PairingSchema = SchemaFactory.createForClass(Pairing);
