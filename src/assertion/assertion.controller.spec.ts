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

import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  AssertionCredentialJSON,
  LiquidAssertionCredentialJSON,
  PublicKeyCredentialRequestOptions,
} from './assertion.dto.js';
import configurationFixture from '../__fixtures__/configuration.fixture.json';
import androidUserAgentFixtures from '../__fixtures__/user-agent.android.fixtures.json';
import { PairingService } from '../pairings/pairing.service.js';
import { mockPairingService } from '../__mocks__/pairing.service.mock.js';

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
} as unknown as LiquidAssertionCredentialJSON;

describe('AssertionController', () => {
  let assertionController: AssertionController;
  let authService: AuthService;
  let userModel: Model<User>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPairingService.bindInvitation.mockRejectedValue(
      new NotFoundException('Pairing invitation not found or expired'),
    );
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
          provide: PairingService,
          useValue: mockPairingService,
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
    it('should bind a pairing invitation to the issued challenge', async () => {
      const requestId = '019097ff-bb8c-75b3-a913-761d038cb9c0';
      const session: Record<string, any> = {};
      mockPairingService.bindInvitation.mockResolvedValueOnce({
        pairingId: requestId,
      } as any);
      authService.search = jest
        .fn()
        .mockResolvedValue(assertionResponseResponseFixtures[0]);
      await assertionController.request(
        session,
        assertionRequestParamFixtures[0],
        {
          ...assertionRequestBodyFixtures[0],
          requestId,
        } as PublicKeyCredentialRequestOptions,
      );
      expect(mockPairingService.bindInvitation).toHaveBeenCalledWith(requestId);
      expect(session.pairingRequestId).toBe(requestId);
    });
    it('should proceed as legacy when a request id has no v2 invitation', async () => {
      const requestId = 'legacy-request-123456789';
      const session: Record<string, any> = {};
      authService.search = jest
        .fn()
        .mockResolvedValue(assertionResponseResponseFixtures[0]);

      await expect(
        assertionController.request(session, assertionRequestParamFixtures[0], {
          ...assertionRequestBodyFixtures[0],
          requestId,
        } as PublicKeyCredentialRequestOptions),
      ).resolves.toEqual(
        expect.objectContaining({ challenge: expect.any(String) }),
      );
      expect(session.pairingRequestId).toBeUndefined();
    });
    it('should propagate backend failures while looking up an invitation', async () => {
      const failure = new Error('MongoDB is unavailable');
      mockPairingService.bindInvitation.mockRejectedValueOnce(failure);
      authService.search = jest
        .fn()
        .mockResolvedValue(assertionResponseResponseFixtures[0]);

      await expect(
        assertionController.request({}, assertionRequestParamFixtures[0], {
          ...assertionRequestBodyFixtures[0],
          requestId: 'legacy-request-123456789',
        } as PublicKeyCredentialRequestOptions),
      ).rejects.toBe(failure);
    });
  });

  describe('POST /response', () => {
    it('should verify the assertion from the client', async () => {
      await Promise.all(
        assertionResponseBodyFixtures.map(async (fixture, i) => {
          authService.search = jest.fn().mockResolvedValue({
            ...assertionResponseResponseFixtures[i],
            credentials: [
              {
                ...assertionResponseResponseFixtures[i].credentials[0],
                prevCounter:
                  assertionResponseResponseFixtures[i].credentials[0]
                    .prevCounter - 1,
              },
            ],
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
          ).resolves.toStrictEqual(assertionResponseResponseFixtures[i]);
        }),
      );
    });
    it('should approve and return the challenge-bound pairing', async () => {
      const savedUser = {
        ...assertionResponseResponseFixtures[0],
        credentials: [
          {
            ...assertionResponseResponseFixtures[0].credentials[0],
            prevCounter:
              assertionResponseResponseFixtures[0].credentials[0].prevCounter -
              1,
          },
        ],
      };
      authService.search = jest.fn().mockResolvedValue(savedUser);
      const body =
        assertionResponseBodyFixtures[0] as unknown as AssertionCredentialJSON & {
          clientExtensionResults: { liquid: { requestId: string } };
        };
      const requestId = body.clientExtensionResults.liquid.requestId;
      const pairing = {
        version: 2 as const,
        pairingId: requestId,
        role: 'controller' as const,
        credential: 'controller-credential',
      };
      mockPairingService.approveInvitation.mockResolvedValueOnce(pairing);

      await expect(
        assertionController.response(
          {
            challenge: assertionRequestResponseFixtures[0].challenge,
            pairingRequestId: requestId,
          },
          { 'user-agent': androidUserAgentFixtures[0] },
          body,
        ),
      ).resolves.toEqual({
        ...assertionResponseResponseFixtures[0],
        pairing,
      });
      expect(mockPairingService.approveInvitation).toHaveBeenCalledWith(
        requestId,
        assertionResponseResponseFixtures[0].wallet,
        body.id,
      );
    });
    it('should approve a v2 pairing supplied only in a verified legacy response', async () => {
      const savedUser = {
        ...assertionResponseResponseFixtures[0],
        credentials: [
          {
            ...assertionResponseResponseFixtures[0].credentials[0],
            prevCounter:
              assertionResponseResponseFixtures[0].credentials[0].prevCounter -
              1,
          },
        ],
      };
      authService.search = jest.fn().mockResolvedValue(savedUser);
      const body =
        assertionResponseBodyFixtures[0] as unknown as AssertionCredentialJSON & {
          clientExtensionResults: { liquid: { requestId: string } };
        };
      const requestId = body.clientExtensionResults.liquid.requestId;
      const pairing = {
        version: 2 as const,
        pairingId: requestId,
        role: 'controller' as const,
        credential: 'controller-credential',
      };
      mockPairingService.bindInvitation.mockResolvedValueOnce({
        pairingId: requestId,
      } as any);
      mockPairingService.approveInvitation.mockResolvedValueOnce(pairing);

      await expect(
        assertionController.response(
          { challenge: assertionRequestResponseFixtures[0].challenge },
          { 'user-agent': androidUserAgentFixtures[0] },
          body,
        ),
      ).resolves.toEqual({
        ...assertionResponseResponseFixtures[0],
        pairing,
      });
      expect(mockPairingService.bindInvitation).toHaveBeenCalledWith(requestId);
      expect(mockPairingService.approveInvitation).toHaveBeenCalledWith(
        requestId,
        assertionResponseResponseFixtures[0].wallet,
        body.id,
      );
    });
    it('should propagate backend failures for response-only pairing ids', async () => {
      const savedUser = {
        ...assertionResponseResponseFixtures[0],
        credentials: [
          {
            ...assertionResponseResponseFixtures[0].credentials[0],
            prevCounter:
              assertionResponseResponseFixtures[0].credentials[0].prevCounter -
              1,
          },
        ],
      };
      authService.search = jest.fn().mockResolvedValue(savedUser);
      const failure = new Error('MongoDB is unavailable');
      mockPairingService.bindInvitation.mockRejectedValueOnce(failure);
      const body =
        assertionResponseBodyFixtures[0] as unknown as AssertionCredentialJSON & {
          clientExtensionResults: { liquid: { requestId: string } };
        };

      await expect(
        assertionController.response(
          { challenge: assertionRequestResponseFixtures[0].challenge },
          { 'user-agent': androidUserAgentFixtures[0] },
          body,
        ),
      ).rejects.toBe(failure);
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
          authService.search = jest.fn().mockResolvedValue({
            ...assertionResponseResponseFixtures[i],
            credentials: [
              {
                ...assertionResponseResponseFixtures[i].credentials[0],
                prevCounter:
                  assertionResponseResponseFixtures[i].credentials[0]
                    .prevCounter - 1,
              },
            ],
          });

          const session = {
            challenge: assertionRequestResponseFixtures[i].challenge,
          };
          const headers = { 'user-agent': androidUserAgentFixtures[0] };
          const body = fixture as unknown as AssertionCredentialJSON & {
            clientExtensionResults: { liquid: { requestId: string } };
          };
          body.response.signature =
            'WEUCIQDcV2y6ub3Qh8pyTCCLdWKRH_cmR2xlFuNy1Fn1QsSUygIgTZh9b6mB77C-aQrBj7Evb8u3S4j3vjlnSPAKcR7Kld4';
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
      await expect(
        assertionController.response(
          session,
          req,
          dummyAssertionCredentialJSON,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
    it('should reject a pairing response for a different challenge binding', async () => {
      const body =
        assertionResponseBodyFixtures[0] as unknown as AssertionCredentialJSON & {
          clientExtensionResults: { liquid: { requestId: string } };
        };
      await expect(
        assertionController.response(
          {
            challenge: assertionRequestResponseFixtures[0].challenge,
            pairingRequestId: 'different-pairing-id',
          },
          { 'user-agent': androidUserAgentFixtures[0] },
          body,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
