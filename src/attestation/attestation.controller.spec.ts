import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service.js';
import { Session } from '../auth/session.schema.js';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../auth/auth.schema.js';
import { getModelToken } from '@nestjs/mongoose';
import { AttestationController } from './attestation.controller.js';
import { mockAuthService } from '../__mocks__/auth.service.mock.js';
import { mockAccountLinkService } from '../__mocks__/account-link.service.mock.js';
import { AppService } from '../app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AttestationService } from './attestation.service.js';
import {
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AttestationCredentialJSONDto,
  AttestationSelectorDto,
} from './attestation.dto.js';
import { AlgodService } from '../algod/algod.service.js';
import configurationFixture from '../__fixtures__/configuration.fixture.json';
import androidUserAgentFixtures from '../__fixtures__/user-agent.android.fixtures.json';
import attestationRequestResponseFixtures from './__fixtures__/attestation.request.response.fixtures.json';
import attestationRequestBodyFixtures from './__fixtures__/attestation.request.body.fixtures.json';
import attestationResponseBodyFixtures from './__fixtures__/attestation.response.body.fixtures.json';
import attestationResponseResponseFixtures from './__fixtures__/attestation.response.response.fixtures.json';
import { PairingService } from '../pairings/pairing.service.js';
import { mockPairingService } from '../__mocks__/pairing.service.mock.js';
describe('AttestationController', () => {
  let attestationController: AttestationController;
  let userModel: Model<User>;
  let authService: AuthService;
  beforeEach(async () => {
    jest.resetAllMocks();
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
      controllers: [AttestationController],
      providers: [
        ConfigService,
        AlgodService,
        {
          provide: AuthService,
          useValue: { ...mockAuthService },
        },
        AppService,
        AttestationService,
        {
          provide: 'ACCOUNT_LINK_SERVICE',
          useValue: mockAccountLinkService,
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
    attestationController = moduleRef.get<AttestationController>(
      AttestationController,
    );
  });

  it('should be defined', () => {
    expect(attestationController).toBeDefined();
  });

  describe('POST /request', () => {
    it('should create PublicKeyCredentialCreationOptions', async () => {
      await Promise.all(
        attestationRequestBodyFixtures.map(async (fixture, i) => {
          const setChallengeSpy = jest.fn();
          const setLiquidExtensionSpy = jest.fn();
          const response = await attestationController.request(
            {
              set challenge(str: string) {
                setChallengeSpy(str);
              },
              set liquidExtension(val: boolean) {
                setLiquidExtensionSpy(val);
              },
            },
            fixture as AttestationSelectorDto,
          );
          expect(response).toEqual({
            ...attestationRequestResponseFixtures[i],
            challenge: response.challenge,
          });
          expect(setChallengeSpy).toHaveBeenCalledWith(response.challenge);
          expect(setLiquidExtensionSpy).toHaveBeenCalledWith(true);
        }),
      );
    });
    it('should fail if liquid extension is not enabled', async () => {
      attestationRequestBodyFixtures.forEach((fixture) => {
        expect(() =>
          attestationController.request({}, {
            ...fixture,
            extensions: {},
          } as AttestationSelectorDto),
        ).rejects.toThrow(NotImplementedException);
      });
    });
    it('should bind a pairing invitation to the issued challenge', async () => {
      const requestId = '019097ff-bb8c-7514-a0c6-5209d2405a4a';
      const session: Record<string, any> = {};
      mockPairingService.bindInvitation.mockResolvedValueOnce({
        pairingId: requestId,
      } as any);
      await attestationController.request(session, {
        ...attestationRequestBodyFixtures[0],
        requestId,
      } as AttestationSelectorDto);
      expect(mockPairingService.bindInvitation).toHaveBeenCalledWith(requestId);
      expect(session.pairingRequestId).toBe(requestId);
    });
    it('should proceed as legacy when a request id has no v2 invitation', async () => {
      const session: Record<string, any> = {};
      await expect(
        attestationController.request(session, {
          ...attestationRequestBodyFixtures[0],
          requestId: 'legacy-request-123456789',
        } as AttestationSelectorDto),
      ).resolves.toEqual(
        expect.objectContaining({ challenge: expect.any(String) }),
      );
      expect(session.pairingRequestId).toBeUndefined();
    });
    it('should propagate backend failures while looking up an invitation', async () => {
      const failure = new Error('MongoDB is unavailable');
      mockPairingService.bindInvitation.mockRejectedValueOnce(failure);
      await expect(
        attestationController.request({}, {
          ...attestationRequestBodyFixtures[0],
          requestId: 'legacy-request-123456789',
        } as AttestationSelectorDto),
      ).rejects.toBe(failure);
    });
  });

  describe('POST /response', () => {
    it('should register a key and emit to connected clients', async () => {
      const session: Record<string, any> = new Session();
      authService.addCredential = jest
        .fn()
        .mockResolvedValue(attestationResponseResponseFixtures[0]);
      session.challenge = attestationRequestResponseFixtures[0].challenge;
      session.liquidExtension = true;
      const body =
        attestationResponseBodyFixtures[0] as AttestationCredentialJSONDto;
      const headers = { 'user-agent': androidUserAgentFixtures[0] };
      await expect(
        attestationController.response(session, headers, body),
      ).resolves.toBe(attestationResponseResponseFixtures[0]);
      expect(session.challenge).toBeUndefined();
      expect(session.liquidExtension).toBeUndefined();
      expect(session.wallet).toEqual(
        attestationResponseResponseFixtures[0].wallet,
      );
      expect(mockAccountLinkService.emit).toHaveBeenCalledWith('auth', {
        requestId: body.clientExtensionResults.liquid.requestId,
        wallet: body.clientExtensionResults.liquid.address,
        credId: body.id,
      });
    });
    it('should approve and return the challenge-bound pairing', async () => {
      const session: Record<string, any> = new Session();
      const user = attestationResponseResponseFixtures[0];
      const body =
        attestationResponseBodyFixtures[0] as AttestationCredentialJSONDto;
      const requestId = body.clientExtensionResults.liquid.requestId;
      const pairing = {
        version: 2 as const,
        pairingId: requestId,
        role: 'controller' as const,
        credential: 'controller-credential',
      };
      authService.addCredential = jest.fn().mockResolvedValue(user);
      mockPairingService.approveInvitation.mockResolvedValueOnce(pairing);
      session.challenge = attestationRequestResponseFixtures[0].challenge;
      session.liquidExtension = true;
      session.pairingRequestId = requestId;

      await expect(
        attestationController.response(
          session,
          { 'user-agent': androidUserAgentFixtures[0] },
          body,
        ),
      ).resolves.toEqual({ ...user, pairing });
      expect(mockPairingService.approveInvitation).toHaveBeenCalledWith(
        requestId,
        user.wallet,
        body.id,
      );
      expect(mockAccountLinkService.emit).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({
          requestId,
          pairingId: requestId,
          wallet: user.wallet,
        }),
      );
    });
    it('should approve a v2 pairing supplied only in a verified legacy response', async () => {
      const session: Record<string, any> = new Session();
      const user = attestationResponseResponseFixtures[0];
      const body =
        attestationResponseBodyFixtures[0] as AttestationCredentialJSONDto;
      const requestId = body.clientExtensionResults.liquid.requestId;
      const pairing = {
        version: 2 as const,
        pairingId: requestId,
        role: 'controller' as const,
        credential: 'controller-credential',
      };
      authService.addCredential = jest.fn().mockResolvedValue(user);
      mockPairingService.bindInvitation.mockResolvedValueOnce({
        pairingId: requestId,
      } as any);
      mockPairingService.approveInvitation.mockResolvedValueOnce(pairing);
      session.challenge = attestationRequestResponseFixtures[0].challenge;
      session.liquidExtension = true;

      await expect(
        attestationController.response(
          session,
          { 'user-agent': androidUserAgentFixtures[0] },
          body,
        ),
      ).resolves.toEqual({ ...user, pairing });
      expect(mockPairingService.bindInvitation).toHaveBeenCalledWith(requestId);
      expect(mockPairingService.approveInvitation).toHaveBeenCalledWith(
        requestId,
        user.wallet,
        body.id,
      );
    });
    it('should propagate backend failures for response-only pairing ids', async () => {
      const session: Record<string, any> = new Session();
      const body =
        attestationResponseBodyFixtures[0] as AttestationCredentialJSONDto;
      const failure = new Error('MongoDB is unavailable');
      mockPairingService.bindInvitation.mockRejectedValueOnce(failure);
      session.challenge = attestationRequestResponseFixtures[0].challenge;
      session.liquidExtension = true;

      await expect(
        attestationController.response(
          session,
          { 'user-agent': androidUserAgentFixtures[0] },
          body,
        ),
      ).rejects.toBe(failure);
    });
    it('should set a default device if empty', async () => {
      const session: Record<string, any> = new Session();
      authService.addCredential = jest
        .fn()
        .mockResolvedValue(attestationResponseResponseFixtures[0]);
      session.challenge = attestationRequestResponseFixtures[0].challenge;
      session.liquidExtension = true;
      const body = {
        ...attestationResponseBodyFixtures[0],
        clientExtensionResults: {
          liquid: {
            ...attestationResponseBodyFixtures[0].clientExtensionResults.liquid,
            device: null,
          },
        },
      } as AttestationCredentialJSONDto;
      const headers = { 'user-agent': androidUserAgentFixtures[0] };
      await expect(
        attestationController.response(session, headers, body),
      ).resolves.toBe(attestationResponseResponseFixtures[0]);
      expect(session.challenge).toBeUndefined();
      expect(session.liquidExtension).toBeUndefined();
      expect(mockAccountLinkService.emit).toHaveBeenCalledWith('auth', {
        requestId: body.clientExtensionResults.liquid.requestId,
        wallet: body.clientExtensionResults.liquid.address,
        credId: body.id,
      });
    });
    it('should fail if the challenge is not a string', async () => {
      await Promise.all(
        attestationResponseBodyFixtures.map(async (fixture) => {
          const body = fixture as AttestationCredentialJSONDto;
          const headers = { 'user-agent': androidUserAgentFixtures[0] };

          await expect(() =>
            attestationController.response(
              {
                challenge: null,
              },
              headers,
              body,
            ),
          ).rejects.toThrow(UnauthorizedException);
        }),
      );
    });
    it(`should fail when liquid is not enabled`, async () => {
      await Promise.all(
        attestationResponseBodyFixtures.map(async (fixture, i) => {
          const body = fixture as AttestationCredentialJSONDto;
          const headers = { 'user-agent': androidUserAgentFixtures[0] };
          const session = {
            challenge: attestationRequestResponseFixtures[i].challenge,
          };
          await expect(
            attestationController.response(session, headers, body),
          ).rejects.toThrow(NotImplementedException);
        }),
      );
    });
    it(`should fail when liquid is enabled without client extension results`, async () => {
      await Promise.all(
        attestationResponseBodyFixtures.map(async (fixture, i) => {
          const body = {
            ...fixture,
            clientExtensionResults: {},
          } as unknown as AttestationCredentialJSONDto;
          const headers = { 'user-agent': androidUserAgentFixtures[0] };
          const session = {
            challenge: attestationRequestResponseFixtures[i].challenge,
            liquidExtension: true,
          };
          await expect(
            attestationController.response(session, headers, body),
          ).rejects.toThrow(UnauthorizedException);
        }),
      );
    });
    it('should reject a pairing response for a different challenge binding', async () => {
      const body =
        attestationResponseBodyFixtures[0] as AttestationCredentialJSONDto;
      await expect(
        attestationController.response(
          {
            challenge: attestationRequestResponseFixtures[0].challenge,
            liquidExtension: true,
            pairingRequestId: 'different-pairing-id',
          },
          { 'user-agent': androidUserAgentFixtures[0] },
          body,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
    it(`should fail when the extension data is invalid`, async () => {
      await Promise.all(
        attestationResponseBodyFixtures.map(async (fixture, i) => {
          const body = {
            ...fixture,
            clientExtensionResults: {
              liquid: {
                ...fixture.clientExtensionResults.liquid,
                signature:
                  'zM0bKHTntG3VtAp_1nAgsxK2F__bv5FukQAB6W-SMEkcvGPPkXbAmahudJB9M0HTBCcwymH7rjvnO2qR73F7AA',
              },
            },
          } as AttestationCredentialJSONDto;
          const headers = { 'user-agent': androidUserAgentFixtures[0] };
          const session = {
            challenge: attestationRequestResponseFixtures[i].challenge,
            liquidExtension: true,
          };
          await expect(() =>
            attestationController.response(session, headers, body),
          ).rejects.toThrow(UnauthorizedException);
        }),
      );
    });
  });
});
