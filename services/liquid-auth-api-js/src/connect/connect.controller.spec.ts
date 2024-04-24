import { Test, TestingModule } from '@nestjs/testing';
import { AlgodService } from '../algod/algod.service.js';
import { ConnectController } from './connect.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { Session } from '../auth/session.schema.js';
import { accFixture } from '../../tests/constants.js';
import { mockAuthService } from '../__mocks__/auth.service.mock.js';
import { mockAccountLinkService } from '../__mocks__/account-link.service.mock.js';

describe('ConnectController', () => {
  let connectController: ConnectController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ConnectController],
      providers: [
        {
          provide: AuthService,
          useValue: { ...mockAuthService },
        },
        {
          provide: 'ACCOUNT_LINK_SERVICE',
          useValue: { ...mockAccountLinkService },
        },
        {
          provide: AlgodService,
          useValue: {
            accountInformation: jest.fn().mockReturnThis(),
            exclude: jest.fn().mockReturnThis(),
            do: jest.fn().mockResolvedValue({
              'auth-addr': accFixture.accs[1].addr,
            }),
          },
        },
      ],
    }).compile();

    connectController = moduleRef.get<ConnectController>(ConnectController);
  });

  it('should be defined', () => {
    expect(connectController).toBeDefined();
  });

  describe('connect response', () => {
    it('(CREATED) should return undefined when a valid account & signature requests to connect', async () => {
      const session = new Session();

      const linkResponseDTO = {
        requestId: 0,
        wallet: accFixture.accs[0].addr,
        challenge: accFixture.challenge,
        signature: accFixture.accs[0].signature,
        credId: '',
      };

      const response = await connectController.linkWalletResponse(
        session,
        linkResponseDTO,
      );

      expect(response).toBe(undefined);
    });

    it("(FAIL) should throw an error when the signature doesn't match the account", async () => {
      const session = new Session();

      const linkResponseDTO = {
        requestId: 0,
        wallet: accFixture.accs[0].addr,
        challenge: accFixture.challenge,
        signature: accFixture.accs[2].signature,
        credId: '',
      };

      await expect(
        connectController.linkWalletResponse(session, linkResponseDTO),
      ).rejects.toThrowError();
    });

    it('(CREATED) should return undefined when a valid account & auth address signature requests to connect', async () => {
      const session = new Session();

      const linkResponseDTO = {
        requestId: 0,
        wallet: accFixture.accs[0].addr,
        challenge: accFixture.challenge,
        signature: accFixture.accs[1].signature,
        credId: '',
      };

      const response = await connectController.linkWalletResponse(
        session,
        linkResponseDTO,
      );

      expect(response).toBe(undefined);
    });
  });
});
