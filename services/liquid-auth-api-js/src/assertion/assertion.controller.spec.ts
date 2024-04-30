import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service.js';
import { Session } from '../auth/session.schema.js';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../auth/auth.schema.js';
import { getModelToken } from '@nestjs/mongoose';
import { Request } from 'express';
import { AssertionController } from './assertion.controller.js';
import { AssertionService } from './assertion.service.js';
import { mockAuthService } from '../__mocks__/auth.service.mock.js';
import { mockAccountLinkService } from '../__mocks__/account-link.service.mock.js';
import { AppService } from '../app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';

import assertionRequestBodyFixtures from './__fixtures__/assertion.request.body.fixtures.json';
import assertionRequestParamFixtures from './__fixtures__/assertion.request.param.fixtures.json';
import assertionRequestResponseFixtures from './__fixtures__/assertion.request.response.fixtures.json';
import assertionResponseBodyFixtures from './__fixtures__/assertion.response.body.fixtures.json';
import assertionResponseResponseFixtures from './__fixtures__/assertion.response.response.fixtures.json';

import { UnauthorizedException } from '@nestjs/common';
import {
  PublicKeyCredentialRequestOptions,
  LiquidAssertionCredentialJSON,
  AssertionCredentialJSON,
} from './assertion.dto.js';
import configurationFixture from '../__fixtures__/configuration.fixture.json';
import androidUserAgentFixtures from '../__fixtures__/user-agent.android.fixtures.json';

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
} as LiquidAssertionCredentialJSON;

describe('AssertionController', () => {
  let assertionController: AssertionController;
  let authService: AuthService;
  let userModel: Model<User>;

  beforeEach(async () => {
    userModel = mongoose.model('User', UserSchema);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => configurationFixture],
        }),
      ],
      controllers: [AssertionController],
      providers: [
        ConfigService,
        {
          provide: AuthService,
          useValue: { ...mockAuthService },
        },
        AppService,
        AssertionService,
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

  describe('POST /request/:credId', () => {
    it('should create a valid assertion request', async () => {
      await Promise.all(
        assertionRequestBodyFixtures.map(async (fixture, i) => {
          const setChallengeSpy = jest.fn();
          authService.search = jest
            .fn()
            .mockResolvedValue(assertionResponseResponseFixtures[i]);
          const credId = assertionRequestParamFixtures[i];
          const body = fixture as PublicKeyCredentialRequestOptions;
          const response = await assertionController.request(
            {
              set challenge(str: string) {
                setChallengeSpy(str);
              },
            },
            credId,
            body,
          );
          expect(response).toEqual({
            ...assertionRequestResponseFixtures[i],
            challenge: response.challenge,
          });
          expect(setChallengeSpy).toHaveBeenCalledWith(response.challenge);
        }),
      );
    });
    it('should fail if it cannot find the user', async () => {
      await Promise.all(
        assertionRequestBodyFixtures.map(async (fixture, i) => {
          authService.search = jest.fn().mockResolvedValue(null);
          const credId = assertionRequestParamFixtures[i];
          const body = fixture as PublicKeyCredentialRequestOptions;
          expect(assertionController.request({}, credId, body)).rejects.toThrow(
            UnauthorizedException,
          );
        }),
      );
    });
  });

  describe('POST /response', () => {
    it('should verify the assertion from the client', async () => {
      await Promise.all(
        assertionResponseBodyFixtures.map(async (fixture, i) => {
          authService.search = jest
            .fn()
            .mockResolvedValue(assertionResponseResponseFixtures[i]);

          const session = {
            challenge: assertionRequestResponseFixtures[i].challenge,
          };
          const headers = { 'user-agent': androidUserAgentFixtures[0] };
          const body = fixture as unknown as AssertionCredentialJSON & {
            clientExtensionResults: { liquid: { requestId: string } };
          };
          await expect(
            assertionController.response(session, headers, body),
          ).resolves.toBe(assertionResponseResponseFixtures[i]);
        }),
      );
    });
    it('should fail if the user is not found', async () => {
      await Promise.all(
        assertionResponseBodyFixtures.map(async (fixture, i) => {
          authService.search = jest.fn().mockResolvedValue(null);

          const session = {
            challenge: assertionRequestResponseFixtures[i].challenge,
          };
          const headers = { 'user-agent': androidUserAgentFixtures[0] };
          const body = fixture as unknown as AssertionCredentialJSON & {
            clientExtensionResults: { liquid: { requestId: string } };
          };
          await expect(
            assertionController.response(session, headers, body),
          ).rejects.toThrow(UnauthorizedException);
        }),
      );
    });
    it('should fail if the signature is invalid', async () => {
      await Promise.all(
        assertionResponseBodyFixtures.map(async (fixture, i) => {
          authService.search = jest
            .fn()
            .mockResolvedValue(assertionResponseResponseFixtures[i]);

          const session = {
            challenge: assertionRequestResponseFixtures[i].challenge,
          };
          const headers = { 'user-agent': androidUserAgentFixtures[0] };
          const body = fixture as unknown as AssertionCredentialJSON & {
            clientExtensionResults: { liquid: { requestId: string } };
          };
          body.response.signature = 'INVALIDSIGNATURE';
          await expect(
            assertionController.response(session, headers, body),
          ).rejects.toThrow(UnauthorizedException);
        }),
      );
    });
    it('should fail if the credential is not found', async () => {
      await Promise.all(
        assertionResponseBodyFixtures.map(async (fixture, i) => {
          authService.search = jest.fn().mockResolvedValue({
            ...assertionResponseResponseFixtures[i],
            credentials: [],
          });

          const session = {
            challenge: assertionRequestResponseFixtures[i].challenge,
          };
          const headers = { 'user-agent': androidUserAgentFixtures[0] };
          const body = fixture as unknown as AssertionCredentialJSON & {
            clientExtensionResults: { liquid: { requestId: string } };
          };
          await expect(
            assertionController.response(session, headers, body),
          ).rejects.toThrow(UnauthorizedException);
        }),
      );
    });
    it('should fail if the challenge is not a string', async () => {
      const session: Record<string, any> = new Session();
      session.challenge = 0;

      const req = {} as any as Request;
      const body = dummyAssertionCredentialJSON;

      await expect(
        assertionController.response(session, req, body),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
