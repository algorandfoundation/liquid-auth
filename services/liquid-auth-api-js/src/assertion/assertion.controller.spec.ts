import * as crypto from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { Session } from '../connect/session.schema';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../auth/auth.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Request } from 'express';
import { AssertionController } from './assertion.controller';
import { AssertionService } from './assertion.service';
import { dummyUsers, dummyOptions } from '../../tests/constants';
import { mockAuthService } from '../__mocks__/auth.service.mock';
import { mockAssertionService } from '../__mocks__/assertion.service.mock';
import { mockAccountLinkService } from '../__mocks__/account-link.service.mock';
import { AppService } from '../app.service';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';

// PublicKeyCredentialRequestOptions
const dummyPublicKeyCredentialRequestOptions = {
  challenge: Buffer.from('1234'),
};

// AssertionCredentialJSON
const dummyAssertionCredentialJSON = {
  id: '',
  type: '',
  rawId: 'mreh',
  response: {
    authenticatorData: '',
    clientDataJSON: '',
    signature: '',
  },
};

describe('AssertionController', () => {
  let assertionController: AssertionController;
  let authService: AuthService;
  let userModel: Model<User>;

  beforeEach(async () => {
    userModel = mongoose.model('User', UserSchema);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AssertionController],
      providers: [
        ConfigService,
        {
          provide: AuthService,
          useValue: { ...mockAuthService },
        },
        AppService,
        {
          provide: AssertionService,
          useValue: { ...mockAssertionService },
        },
        {
          provide: 'ACCOUNT_LINK_SERVICE',
          useValue: { ...mockAccountLinkService },
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    assertionController =
      moduleRef.get<AssertionController>(AssertionController);
  });

  it('should be defined', () => {
    expect(assertionController).toBeDefined();
  });

  describe('Get /request/:credId', () => {
    it('(OK) should save the challenge', async () => {
      const session = new Session();
      const req = { body: {}, params: { credId: 1 } } as any as Request;
      const body = dummyPublicKeyCredentialRequestOptions;

      await expect(
        assertionController.assertionDemoRequest(session, req, body),
      ).resolves.toBe(dummyOptions);
    });
  });

  describe('Get /request/:credId search failure', () => {
    authService.search = jest.fn().mockResolvedValue(undefined);

    it('(FAIL) should fail if it cannot find a user', async () => {
      const session = new Session();
      const req = { body: {}, params: { credId: 1 } } as any as Request;
      const body = dummyPublicKeyCredentialRequestOptions;

      await expect(
        assertionController.assertionDemoRequest(session, req, body),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Post /request/:credId', () => {
    it('(OK) should create a valid assertion request', async () => {
      const session = new Session();
      const req = { body: {}, params: { credId: 1 } } as any as Request;
      const body = dummyPublicKeyCredentialRequestOptions;

      await expect(
        assertionController.assertionRequest(session, req, body),
      ).resolves.toBe(dummyOptions);
    });
  });

  describe('Post /request/:credId search failure', () => {
    authService.search = jest.fn().mockResolvedValue(undefined);

    it('(FAIL) should fail if it cannot find a user', async () => {
      const session = new Session();
      const req = { body: {}, params: { credId: 1 } } as any as Request;
      const body = dummyPublicKeyCredentialRequestOptions;

      await expect(
        assertionController.assertionRequest(session, req, body),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Post /response', () => {
    it('(OK) should verify the assertion from the client', async () => {
      const dummyUser = dummyUsers[0];

      const session: Record<string, any> = new Session();
      session.challenge = crypto.randomBytes(32).toString('base64url');

      const req = {
        get: jest.fn().mockReturnValue('User-Agent String'),
      } as any as Request;
      const body = dummyAssertionCredentialJSON;

      await expect(
        assertionController.assertionResponse(session, req, body),
      ).resolves.toBe(dummyUser);
    });

    it('(FAIL) should fail if the challenge is not a string', async () => {
      const session: Record<string, any> = new Session();
      session.challenge = 0;

      const req = {} as any as Request;
      const body = dummyAssertionCredentialJSON;

      await expect(
        assertionController.assertionResponse(session, req, body),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Post /response search failure', () => {
    authService.search = jest.fn().mockResolvedValue(undefined);

    it('(FAIL) should fail if it cannot find the user', async () => {
      const session: Record<string, any> = new Session();
      session.challenge = crypto.randomBytes(32).toString('base64url');

      const req = {} as any as Request;
      const body = dummyAssertionCredentialJSON;

      await expect(
        assertionController.assertionResponse(session, req, body),
      ).rejects.toThrow(HttpException);
    });
  });
});
