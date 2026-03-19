import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

/**
 *
 */
@Schema()
export class Session {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  expires: Date;

  @Prop({ required: true })
  session: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
