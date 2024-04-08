import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { Session } from '../connect/session.schema';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../auth/auth.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Request } from 'express';
import { AttestationController } from './attestation.controller';
import { accFixture, dummyUsers } from '../../tests/constants';
import { AppService } from '../app.service';
import { ConfigService } from '@nestjs/config';
import { AttestationService } from './attestation.service';

const dummyAttestationSelectorDto = {
  authenticatorSelection: {},
};

const dummyACJSON = {
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
  let attestationService: AttestationService;
  let authService: AuthService;
  let userModel: Model<User>;

  beforeEach(async () => {
    userModel = mongoose.model('User', UserSchema);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AttestationController],
      providers: [
        ConfigService,
        AuthService,
        AppService,
        AttestationService,
        {
          provide: 'ACCOUNT_LINK_SERVICE',
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    attestationService = moduleRef.get<AttestationService>(AttestationService);
    attestationController = moduleRef.get<AttestationController>(
      AttestationController,
    );
  });

  it('should be defined', () => {
    expect(attestationController).toBeDefined();
  });

  describe('Post /request', () => {
    it('(OK) should create a challenge', async () => {
      const dummyUser = dummyUsers[0];
      const dummyAttestationOptions = { challenge: 'meh' };

      const session: Record<string, any> = new Session();
      session.wallet = accFixture.accs[0].addr;

      const body = dummyAttestationSelectorDto;
      const req = {
        headers: {
          host: 'meh',
        },
      } as Request;

      authService.find = jest.fn().mockResolvedValue(dummyUser);
      attestationService.request = jest
        .fn()
        .mockReturnValue(dummyAttestationOptions);

      await expect(
        attestationController.request(session, body, req),
      ).resolves.toBe(JSON.stringify(dummyAttestationOptions));
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
      ).rejects.toThrowError();
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
      ).rejects.toThrowError();
    });
  });

  describe('Post /response', () => {
    it('(OK) should register a key', async () => {
      const dummyUser = dummyUsers[0];
      const dummyAttestationOptions = { challenge: 'meh' };

      const session: Record<string, any> = new Session();
      session.wallet = accFixture.accs[0].addr;
      session.challenge = accFixture.challenge;

      const body = dummyACJSON;
      const req = { get: jest.fn() } as any as Request;

      authService.addCredential = jest.fn().mockResolvedValue(dummyUser);
      attestationService.response = jest
        .fn()
        .mockReturnValue(dummyAttestationOptions);

      await expect(
        attestationController.attestationResponse(session, body, req),
      ).resolves.toBe(JSON.stringify(dummyUser));
    });

    it('(FAIL) should fail if the expectedChallenge is not a string', async () => {
      const session: Record<string, any> = new Session();
      session.wallet = accFixture.accs[0].addr;
      session.challenge = 0;

      const body = dummyACJSON;
      const req = { get: jest.fn() } as any as Request;

      await expect(
        attestationController.attestationResponse(session, body, req),
      ).rejects.toThrowError();
    });
  });
});
