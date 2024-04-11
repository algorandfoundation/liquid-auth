import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { Session } from '../connect/session.schema';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../auth/auth.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Request } from 'express';
import { AttestationController } from './attestation.controller';
import {
  accFixture,
  dummyUsers,
  dummyAttestationOptions
} from '../../tests/constants';
import { mockAuthService } from '../__mocks__/auth.service.mock';
import { mockAccountLinkService } from '../__mocks__/account-link.service.mock';
import { mockAttestationService } from '../__mocks__/attestation.service.mock';
import { AppService } from '../app.service';
import { ConfigService } from '@nestjs/config';
import { AttestationService } from './attestation.service';
import { HttpException } from '@nestjs/common';

const dummyAttestationSelectorDto = {
  authenticatorSelection: {},
};

const dummyAttestationCredentialJSON = {
  id: '',
  type: '',
  rawId: 'mreh',
  response: {
    attestationObject: '',
    clientDataJSON: '',
  },
};

describe('AttestationController', () => {
  let attestationController: AttestationController;
  let authService: AuthService;
  let userModel: Model<User>;

  beforeEach(async () => {
    userModel = mongoose.model('User', UserSchema);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AttestationController],
      providers: [
        ConfigService,
        {
          provide: AuthService,
          useValue: { ...mockAuthService },
        },
        AppService,
        {
          provide: AttestationService,
          useValue: { ...mockAttestationService },
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
    attestationController = moduleRef.get<AttestationController>(
      AttestationController,
    );
  });

  it('should be defined', () => {
    expect(attestationController).toBeDefined();
  });

  describe('Post /request', () => {
    it('(OK) should create a challenge', async () => {
      const session: Record<string, any> = new Session();
      session.wallet = accFixture.accs[0].addr;

      const body = dummyAttestationSelectorDto;
      const req = {
        headers: {
          host: 'meh',
        },
      } as Request;

      await expect(
        attestationController.request(session, body, req),
      ).resolves.toBe(dummyAttestationOptions);
    });

    it('(FAIL) should fail if there is no session wallet set', async () => {
      const session: Record<string, any> = new Session();
      const body = dummyAttestationSelectorDto;
      const req = {
        headers: {
          host: 'meh',
        },
      } as Request;

      await expect(
        attestationController.request(session, body, req),
      ).rejects.toThrow(HttpException);
    });

    it('(FAIL) should fail if it cannot find a user', async () => {
      const session: Record<string, any> = new Session();
      session.wallet = accFixture.accs[0].addr;

      const body = dummyAttestationSelectorDto;
      const req = {
        headers: {
          host: 'meh',
        },
      } as Request;

      authService.find = jest.fn().mockResolvedValue(undefined);

      await expect(
        attestationController.request(session, body, req),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Post /response', () => {
    it('(OK) should register a key', async () => {
      const dummyUser = dummyUsers[0];

      const session: Record<string, any> = new Session();
      session.wallet = accFixture.accs[0].addr;
      session.challenge = accFixture.challenge;

      const body = dummyAttestationCredentialJSON;
      const req = { get: jest.fn() } as any as Request;

      await expect(
        attestationController.attestationResponse(session, body, req),
      ).resolves.toBe(dummyUser);
    });

    it('(FAIL) should fail if the expectedChallenge is not a string', async () => {
      const session: Record<string, any> = new Session();
      session.wallet = accFixture.accs[0].addr;
      session.challenge = 0;

      const body = dummyAttestationCredentialJSON;
      const req = { get: jest.fn() } as any as Request;

      await expect(
        attestationController.attestationResponse(session, body, req),
      ).rejects.toThrow(HttpException);
    });
  });
});
