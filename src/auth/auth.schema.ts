import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export type Credential = {
  publicKey: string; //base64PublicKey,
  credId: string; //base64CredentialID,
  prevCounter: number; //counter,
};
@Schema()
export class User {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  wallet: string;

  @Prop({ required: true })
  credentials: Credential[];
}

export const UserSchema = SchemaFactory.createForClass(User);
