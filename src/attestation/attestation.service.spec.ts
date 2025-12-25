import { Test, TestingModule } from '@nestjs/testing';
import { AttestationService } from './attestation.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppService } from '../app.service.js';

import { AlgodService } from '../algod/algod.service.js';
import configurationFixture from '../__fixtures__/configuration.fixture.json';

import attestationRequestResponseFixtures from './__fixtures__/attestation.request.response.fixtures.json';
import attestationResponseBodyFixtures from './__fixtures__/attestation.response.body.fixtures.json';

describe('AttestationService', () => {
  let provider: AttestationService;
  const algodServiceMockFactory = (addr: string) =>
    ({
      exclude: jest.fn().mockReturnThis(),
      do: jest.fn(async () => ({ 'auth-addr': addr })),
      accountInformation: jest.fn().mockReturnThis(),
    }) as unknown as AlgodService;
  let currentMock = algodServiceMockFactory(
    '24FEVK3D3VPVHP2MHVTZZSP6PINKW7PGPYTFHLO6X6LV4VNFWDTM6AQI7U',
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => configurationFixture],
        }),
      ],
      providers: [
        ConfigService,
        {
          provide: AlgodService,
          useValue: currentMock,
        },
        AppService,
        AttestationService,
      ],
    }).compile();
    provider = module.get<AttestationService>(AttestationService);
  });
  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should validate a signature', () => {
    attestationResponseBodyFixtures.forEach((fixture, i) => {
      const liquid = fixture.clientExtensionResults.liquid;
      expect(
        provider.verify(
          currentMock,
          liquid.type,
          attestationRequestResponseFixtures[i].challenge,
          liquid.signature,
          liquid.address,
        ),
      ).resolves.toEqual(true);
    });
  });
  it('should validate a rekeyed address', () => {
    attestationResponseBodyFixtures.forEach((fixture, i) => {
      const rekeyAddress =
        '24FEVK3D3VPVHP2MHVTZZSP6PINKW7PGPYTFHLO6X6LV4VNFWDTM6AQI7U';
      const liquid = fixture.clientExtensionResults.liquid;
      currentMock = algodServiceMockFactory(liquid.address);
      expect(
        provider.verify(
          currentMock,
          liquid.type,
          attestationRequestResponseFixtures[i].challenge,
          liquid.signature,
          rekeyAddress,
        ),
      ).resolves.toEqual(true);
    });
  });
  it('should fail to validate unsupported signatures', () => {
    attestationResponseBodyFixtures.forEach((fixture, i) => {
      const liquid = fixture.clientExtensionResults.liquid;
      currentMock = algodServiceMockFactory(liquid.address);
      expect(
        provider.verify(
          currentMock,
          'unknown',
          attestationRequestResponseFixtures[i].challenge,
          liquid.signature,
          liquid.address,
        ),
      ).resolves.toEqual(false);
    });
  });
});
