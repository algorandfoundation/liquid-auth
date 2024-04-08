import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Session } from '../connect/session.schema';
import mongoose, { Error, Model } from 'mongoose';
import { User, UserSchema } from './auth.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Request, Response } from 'express';
import { dummyUsers } from '../../tests/constants';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;
  let userModel: Model<User>;

  beforeEach(async () => {
    userModel = mongoose.model('User', UserSchema);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    authController = moduleRef.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('Get /all', () => {
    it('(OK) should return all users', async () => {
      userModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(dummyUsers),
      });

      const users = await authController.all();
      expect(users).toBe(JSON.stringify(dummyUsers));
    });

    it('(FAIL) should fail when mongo db throws an error', async () => {
      userModel.find = jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockRejectedValue(new Error('failed to retrieve users')),
      });

      await expect(authController.all()).rejects.toThrowError();
    });
  });

  describe('Get /keys', () => {
    it('(OK) should return a user from their session', async () => {
      const dummyUser = dummyUsers[0];

      userModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(dummyUser),
      });

      const session = new Session();
      const user = await authController.keys(session);

      expect(user).toBe(JSON.stringify(dummyUser));
    });

    it('(FAIL) should fail when mongo db throws an error', async () => {
      userModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('failed to retrieve user')),
      });

      const session = new Session();
      await expect(authController.keys(session)).rejects.toThrowError();
    });
  });

  describe('Delete /keys/:id', () => {
    it('(FAIL) should fail if it cannot find the user', async () => {
      userModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(undefined),
      });

      const session = new Session();
      const req = { body: {}, params: { id: 1 } } as any as Request;
      await expect(authController.remove(session, req)).rejects.toThrowError();
    });

    it('(FAIL) should fail when mongo db throws an error', async () => {
      userModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('failed to find user')),
      });

      const session = new Session();
      const req = { body: {}, params: { id: 1 } } as any as Request;
      await expect(authController.remove(session, req)).rejects.toThrowError();
    });

    it('(OK) should return success: true when removeCredential succeeds', async () => {
      const dummyUser = dummyUsers[0];

      userModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(dummyUser),
      });
      userModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...dummyUser, credentials: [] }),
      });

      const session = new Session();
      const req = { body: {}, params: { id: 1 } } as any as Request;

      await expect(authController.remove(session, req)).resolves.toBe(
        JSON.stringify({ success: true }),
      );
    });

    it('(FAIL) should fail if it cannot remove the credential', async () => {
      const dummyUser = dummyUsers[0];

      userModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(dummyUser),
      });
      userModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('failed to update user')),
      });

      const session = new Session();
      const req = { body: {}, params: { id: 1 } } as any as Request;
      await expect(authController.remove(session, req)).rejects.toThrowError();
    });
  });

  describe('Get /logout', () => {
    it('(OK) should log the user out (removing their session)', async () => {
      const session = new Session();
      const res = {
        status: jest.fn().mockReturnValue(200),
        json: jest.fn().mockReturnValue('{ meh }'),
        redirect: jest.fn(),
      } as any as Response;

      expect(authController.logout(session, res)).toBe(undefined);
    });
  });

  describe('Post /session', () => {
    it('(OK) should create a session', async () => {
      const dummyUser = dummyUsers[0];

      authService.init = jest.fn().mockResolvedValue(dummyUser);

      const session = new Session();
      const body = { wallet: dummyUser.wallet };

      await expect(authController.create(session, body)).resolves.toBe(
        JSON.stringify(dummyUser),
      );
    });

    it('(FAIL) should fail when given a malformed wallet address', async () => {
      const session = new Session();
      const body = { wallet: 'mreh' };

      await expect(authController.create(session, body)).rejects.toThrowError();
    });
  });

  describe('Get /session', () => {
    it('(OK) should fetch a session', async () => {
      const dummyUser = dummyUsers[0];

      userModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(dummyUser),
      });

      const session = new Session();

      await expect(authController.read(session)).resolves.toBe(
        JSON.stringify(dummyUser),
      );
    });

    it('(OK) should return an empty object if the user is not found', async () => {
      userModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(undefined),
      });

      const session = new Session();
      await expect(authController.read(session)).resolves.toBe(
        JSON.stringify({}),
      );
    });
  });
});
