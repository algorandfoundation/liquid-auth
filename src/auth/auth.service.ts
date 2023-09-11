import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './auth.schema.js';
import base64url from 'base64url';
import * as crypto from 'node:crypto';

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
  async create(wallet: string): Promise<User> {
    const createdUser = new this.userModel({
      id: base64url.encode(crypto.randomBytes(32)),
      wallet,
      credentials: [],
    });
    return createdUser.save();
  }
  async find(wallet: string): Promise<User> {
    return this.userModel.findOne({ wallet }).exec();
  }
  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
