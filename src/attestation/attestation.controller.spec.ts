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
import { NotImplementedException, UnauthorizedException } from '@nestjs/common';
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
describe('AttestationController', () => {
  let attestationController: AttestationController;
  let userModel: Model<User>;
  let authService: AuthService;
  beforeEach(async () => {
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
    it('should create PublicKeyCredentialCreationOptions', () => {
      attestationRequestBodyFixtures.forEach((fixture, i) => {
        const setChallengeSpy = jest.fn();
        const setLiquidExtensionSpy = jest.fn();
        const response = attestationController.request(
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
      });
    });
    it('should fail if liquid extension is not enabled', async () => {
      attestationRequestBodyFixtures.forEach((fixture) => {
        expect(() =>
          attestationController.request({}, {
            ...fixture,
            extensions: {},
          } as AttestationSelectorDto),
        ).toThrow(NotImplementedException);
      });
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
