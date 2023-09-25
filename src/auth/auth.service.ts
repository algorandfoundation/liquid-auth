import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import base64url from 'base64url';

import { Credential, User } from './auth.schema.js';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

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
      id: base64url.encode(crypto.randomBytes(32)),
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

  /**
   * Update a User
   *
   * @param user
   */
  async update(user: User): Promise<User> {
    return this.userModel.findOneAndUpdate({ id: user.id }, user).exec();
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
}
