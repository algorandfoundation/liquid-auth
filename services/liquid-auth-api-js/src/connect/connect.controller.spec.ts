import { Test, TestingModule } from '@nestjs/testing';
import { AlgodService } from '../algod/algod.service';
import { ConnectController } from './connect.controller';
import { AuthService } from '../auth/auth.service';
import * as crypto from 'node:crypto';
import { Session } from './session.schema';
import { accFixture } from '../../tests/constants';

describe('ConnectController', () => {
  let connectController: ConnectController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ConnectController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            init: jest.fn().mockResolvedValue({
              id: crypto.randomBytes(32).toString('base64url'),
              wallet: accFixture.accs[0].addr,
              credentials: [],
            }),
          },
        },
        {
          provide: 'ACCOUNT_LINK_SERVICE',
          useValue: {
            emit: jest.fn(),
          },
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

    it("(FAIL)    should throw an error when the signature doesn't match the account", async () => {
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
