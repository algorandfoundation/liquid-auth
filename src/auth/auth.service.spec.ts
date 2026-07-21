import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from './auth.service.js';
import { User } from './auth.schema.js';
import { Session } from './session.schema.js';

describe('AuthService', () => {
  const mockUser = {
    wallet: '2SPDE6XLJNXFTOO7OIGNRNKSEDOHJWVD3HBSEAPHONZQ4IQEYOGYTP6LXA',
    credentials: [],
  };
  const mockCredential = {
    device: 'Pixel 8 Pro',
    publicKey:
      'pQECAyYgASFYIB2dcp3wanhReRhgRIpJCUfRSwkCvyE9OdvEL_NlncSJIlggkSIz7h7O5nrAXGJrkCOmeolChSc09eHzniCFLFxaKH0',
    credId:
      'AYMPi2Rbhcnu2gSHOO1TNvzDJ38iU00rrlCqyH874XCIEoIotRc7eVRFpx0TvsQurg7BAnXy5KnWdKC8LeWs0k0',
    prevCounter: 0,
  };
  const mockSession = {
    _id: '60b3b3b3b3b3b3b3b3b3b3b3',
    expires: new Date(),
    session: JSON.stringify({ wallet: mockUser.wallet }),
  };
  let service: AuthService;
  let userModel;
  let mockUserModel;
  let mockSessionModel;
  beforeEach(async () => {
    mockUserModel = jest.fn(() => ({
      save: jest.fn().mockResolvedValue(mockUser),
      toObject: jest.fn().mockReturnValue({}),
    })) as unknown as Model<User>;
    mockUserModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });
    mockUserModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });
    mockSessionModel = jest.fn(() => ({
      save: jest.fn().mockResolvedValue(mockSession),
      toObject: jest.fn().mockReturnValue({}),
    })) as unknown as Model<Session>;
    mockSessionModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSession),
    });
    mockSessionModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSession),
    });
    mockSessionModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Session.name),
          useValue: mockSessionModel,
        },
        AuthService,
      ],
    }).compile();
    userModel = module.get<Model<User>>(getModelToken(User.name));
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('should initialize a new user', async () => {
    userModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const user = await service.init(mockUser.wallet);
    expect(user).toEqual(mockUser);
  });
  it('should fail to create invalid user', async () => {
    await expect(service.init('&$@#%')).rejects.toThrow(TypeError);
  });
  it('should search for a user', async () => {
    const user = await service.search({ wallet: mockUser.wallet });
    expect(user).toEqual(mockUser);
  });
  it('should update a user', async () => {
    const user = await service.update(mockUser as User);
    expect(user).toEqual(mockUser);
  });
  it('should find a credential', async () => {
    userModel.findOne = jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ ...mockUser, credentials: [mockCredential] }),
    });
    const credential = await service.findCredential(mockCredential.credId);
    expect(credential).toEqual(mockCredential);
  });
  it('should add a credential to a user', async () => {
    const user = await service.addCredential(mockUser.wallet, mockCredential);
    expect(user).toEqual({ ...mockUser, credentials: [mockCredential] });
  });
  it('should not add duplicate credentials', async () => {
    userModel.findOne = jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ ...mockUser, credentials: [mockCredential] }),
    });
    const user = await service.addCredential(mockUser.wallet, mockCredential);
    expect(user).toEqual({ ...mockUser, credentials: [mockCredential] });
  });
  it('should remove a credential from a user', async () => {
    const user = await service.removeCredential(
      { ...mockUser, credentials: [mockCredential] } as User,
      mockCredential.credId,
    );
    expect(user).toEqual(mockUser);
  });

  it('should find a session', async () => {
    const session = await service.findSession(mockSession._id);
    expect(session).toEqual(mockSession);
  });
  it('should update a session', async () => {
    const session = await service.updateSessionWallet(
      mockSession,
      mockUser.wallet,
    );
    expect(session).toEqual(mockSession);
  });
  it('should find an authenticated session by requestId', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    mockSessionModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: mockSession._id,
          session: JSON.stringify({ requestId, wallet: mockUser.wallet }),
        },
      ]),
    });
    const result = await service.findAuthenticatedSessionByRequestId(requestId);
    expect(result).toEqual({
      sessionId: mockSession._id,
      wallet: mockUser.wallet,
    });
  });
  it('should return null for an empty requestId', async () => {
    await expect(
      service.findAuthenticatedSessionByRequestId(''),
    ).resolves.toBeNull();
  });
  it('should exclude the caller session when finding the other party', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    mockSessionModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'offer-session-id',
          session: JSON.stringify({ requestId, wallet: mockUser.wallet }),
        },
        {
          _id: 'wallet-session-id',
          session: JSON.stringify({ requestId, wallet: mockUser.wallet }),
        },
      ]),
    });
    const result = await service.findAuthenticatedSessionByRequestId(
      requestId,
      'offer-session-id',
    );
    expect(result).toEqual({
      sessionId: 'wallet-session-id',
      wallet: mockUser.wallet,
    });
  });
  it('should return null when no session carries a wallet for the requestId', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    mockSessionModel.find = jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue([
          { _id: mockSession._id, session: JSON.stringify({ requestId }) },
        ]),
    });
    await expect(
      service.findAuthenticatedSessionByRequestId(requestId),
    ).resolves.toBeNull();
  });
  it('should find other sessions bound to the same credential, excluding the kept one', async () => {
    const credId = 'a-credential-id';
    mockSessionModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: 'new-session',
          session: JSON.stringify({ wallet: mockUser.wallet, credId }),
        },
        {
          _id: 'stale-session',
          session: JSON.stringify({ wallet: mockUser.wallet, credId }),
        },
        {
          _id: 'other-device-session',
          session: JSON.stringify({
            wallet: mockUser.wallet,
            credId: 'a-different-credential',
          }),
        },
      ]),
    });
    const result = await service.findSessionsByCredId(credId, 'new-session');
    expect(result).toEqual(['stale-session']);
  });
  it('should return no sessions for an empty credId', async () => {
    await expect(service.findSessionsByCredId('')).resolves.toEqual([]);
  });
});
