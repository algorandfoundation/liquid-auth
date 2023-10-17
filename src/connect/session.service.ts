import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Session } from './session.schema.js';

/**
 * Session Service
 *
 * Bypass Nest.js/Express opinions and directly modify the SessionStore
 */
@Injectable()
export class SessionService {
  /**
   * Construct SessionService
   * @param sessionModel - Session Mongoose Model
   */
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
  ) {}

  /**
   * Find a Session by ID
   *
   * @param sid - Session ID
   */
  async find(sid: string): Promise<Session> {
    console.log(`Finding session ${sid}`);
    return this.sessionModel.findOne({ _id: sid }).exec();
  }

  /**
   * Update Wallet by Session ID
   * @param session - The stored Session
   * @param wallet - The Wallet Address
   */
  async updateWallet(session: Session, wallet: string): Promise<Session> {
    console.log(session);
    const data = JSON.parse(session.session);
    data.wallet = wallet;
    return this.sessionModel
      .findOneAndUpdate(
        { _id: session._id },
        {
          session: JSON.stringify(data),
        },
      )
      .exec();
  }
}
