import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = HydratedDocument<User>;
export type CredentialType = {
  device?: string;
  publicKey: string; //base64PublicKey,
  credId: string; //base64CredentialID,
  prevCounter: number; //counter,
};
export class Credential implements CredentialType {
  @ApiProperty()
  device?: string;
  @ApiProperty()
  publicKey: string; //base64PublicKey,
  @ApiProperty()
  credId: string; //base64CredentialID,
  @ApiProperty()
  prevCounter: number; //counter
}
@Schema()
export class User {
  @ApiProperty()
  @Prop({ required: true })
  id: string;

  @ApiProperty()
  @Prop({ required: true })
  wallet: string;

  @ApiProperty({ type: [Credential] })
  @Prop({ required: true })
  credentials: Credential[];
}

export const UserSchema = SchemaFactory.createForClass(User);
