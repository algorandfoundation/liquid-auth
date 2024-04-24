import * as crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { toBase64URL } from '@liquid/core/encoding';
import type { FilterQuery } from 'mongoose';
import { Credential, User } from './auth.schema.js';
import { Session } from './session.schema.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
  ) {}

  /**
   * Initialize a User
   *
   * @param wallet - User ID
   * @throws TypeError - Input Validation Error
   * @throws Error - Database Error
   */
  async init(wallet: string): Promise<User> {
    if (!wallet || !/[a-zA-Z0-9-_]+/.test(wallet)) {
      throw new TypeError('Invalid username');
    }
    let user = await this.find(wallet);
    if (!user) {
      user = await this.create(wallet);
    }
    return user;
  }

  /**
   * Create a New User
   *
   * @param wallet
   */
  async create(wallet: string): Promise<User> {
    const createdUser = new this.userModel({
      id: toBase64URL(crypto.randomBytes(32)),
      wallet,
      credentials: [],
    });
    return createdUser.save();
  }

  /**
   * Find a User
   *
   * @param wallet
   */
  async find(wallet: string): Promise<User> {
    return this.userModel.findOne({ wallet }).exec();
  }
  async search(lookup: FilterQuery<User>) {
    return this.userModel.findOne(lookup).exec();
  }
  /**
   * Update a User
   *
   * @param user
   */
  async update(user: User): Promise<User> {
    return this.userModel.findOneAndUpdate({ id: user.id }, user).exec();
  }
  async findCredential(credId: string) {
    const user = await this.userModel
      .findOne<User>({ 'credentials.credId': credId })
      .exec();
    if (user) {
      return user.credentials.find((cred) => cred.credId === credId);
    }
  }
  async addCredential(id: string, credential: Credential) {
    const user = await this.find(id);

    const existingCred = user.credentials.find(
      (cred) => cred.credId === credential.credId,
    );

    if (!existingCred) {
      user.credentials.push(credential);
      await this.update(user);
    }

    return user;
  }
  async removeCredential(user: User, credId: string) {
    user.credentials = user.credentials.filter(
      (cred) => cred.credId !== credId,
    );
    return this.update(user);
  }

  async all() {
    return this.userModel.find({}).exec();
  }

  /**
   * Find a Session by ID
   *
   * @param sid - Session ID
   */
  async findSession(sid: string): Promise<Session> {
    this.logger.log(`Finding session ${sid}`);
    return this.sessionModel.findOne({ _id: sid }).exec();
  }

  /**
   * Update Wallet by Session ID
   * @param session - The stored Session
   * @param wallet - The Wallet Address
   */
  async updateSessionWallet(
    session: Session,
    wallet: string,
  ): Promise<Session> {
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
