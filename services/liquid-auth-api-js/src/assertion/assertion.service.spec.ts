import { Test, TestingModule } from '@nestjs/testing';
import { AssertionService } from './assertion.service.js';
import { ConfigService } from '@nestjs/config';
import { AppService } from '../app.service.js';
import { Credential, User } from '../auth/auth.schema.js';
import assertionResponseBodyFixtures from './__fixtures__/assertion.response.body.fixtures.json';
import assertionRequestResponseFixtures from './__fixtures__/assertion.request.response.fixtures.json';
import userAgentChromeFixtures from '../__fixtures__/user-agent.chrome.fixtures.json';

describe.skip('AssertionService', () => {
  let provider: AssertionService;
  let configService: ConfigService;
  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key) => {
        if (key === 'origin') {
          return 'https://dev.dontneeda.pw';
        }
        if (key === 'hostname') {
          return 'dev.dontneeda.pw';
        }
        if (key === 'timeout') {
          return 30000;
        }
      }),
    } as unknown as ConfigService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        AppService,
        AssertionService,
      ],
    }).compile();
    configService = module.get<ConfigService>(ConfigService);
    provider = module.get<AssertionService>(AssertionService);
  });
  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it.skip('should verify authentication response', () => {
    const user = new User();
    const credential = new Credential();
    configService.get = jest.fn((key) => {
      if (key === 'origin') {
        return 'https://dev.dontneeda.pw';
      }
      if (key === 'hostname') {
        return 'dev.dontneeda.pw';
      }
      if (key === 'timeout') {
        return 30000;
      }
    });
    credential.credId = assertionResponseBodyFixtures[0].id;
    credential.publicKey =
      'pQECAyYgASFYIIheFp-u6GvFT2LNGovf3ZrT0iFVBsA_76rRysxRG9A1Ilgg8WGeA6hPmnab0HAViUYVRkwTNcN77QBf_RR0dv3lIvQ';
    credential.prevCounter = 144;
    user.credentials = [credential];
    expect(
      provider.response(
        user,
        assertionResponseBodyFixtures[0],
        assertionRequestResponseFixtures[0].challenge,
        userAgentChromeFixtures[0],
      ),
    ).toEqual({
      credentials: [
        {
          credId:
            'KEbWNCc7NgaYnUyrNeFGX9_3Y-8oJ3KwzjnaiD1d1LVTxR7v3CaKfCz2Vy_g_MHSh7yJ8yL0Pxg6jo_o0hYiew',
          prevCounter: 144,
          publicKey:
            'pQECAyYgASFYIIheFp-u6GvFT2LNGovf3ZrT0iFVBsA_76rRysxRG9A1Ilgg8WGeA6hPmnab0HAViUYVRkwTNcN77QBf_RR0dv3lIvQ',
        },
      ],
    });
  });
});
