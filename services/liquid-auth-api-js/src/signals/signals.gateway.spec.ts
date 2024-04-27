import { Test, TestingModule } from '@nestjs/testing';
import { SignalsGateway, reloadSession } from './signals.gateway.js';
import { Server, Socket } from 'socket.io';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../auth/auth.schema.js';
import { AuthService } from '../auth/auth.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { mockAuthService } from '../__mocks__/auth.service.mock.js';

import candidateFixture from './__fixtures__/candidate.fixture.json';
import sdpFixtures from './__fixtures__/sdp.fixtures.json';
import sessionFixtures from '../__fixtures__/session.fixtures.json';
import { Session } from 'express-session';

const clientMock = {
  request: {
    session: sessionFixtures.authorized,
  },
  rooms: new Set(),
  join: jest.fn(),
} as unknown as Socket;
let linkEventFn: any;
const ioAdapterMock = {
  subClient: {
    on: jest.fn((name: string, fn) => {
      linkEventFn = fn;
    }),
    off: jest.fn(),
    subscribe: jest.fn(),
  },
};
jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        emit: jest.fn(),
        in: jest.fn().mockReturnThis(),
        sockets: {
          adapter: ioAdapterMock,
        },
      };
    }),
  };
});

describe('SignalsGateway', () => {
  let gateway: SignalsGateway;
  let userModel: Model<User>;
  beforeEach(async () => {
    userModel = mongoose.model('User', UserSchema);
    Object.keys(sessionFixtures).forEach((key) => {
      sessionFixtures[key].reload = jest.fn(async (fn) => fn(null));
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: AuthService,
          useValue: {
            ...mockAuthService,
            findSession: jest
              .fn()
              .mockResolvedValue(sessionFixtures.authorized),
            updateSessionWallet: jest
              .fn()
              .mockResolvedValue(sessionFixtures.authorized),
          },
        },
        SignalsGateway,
      ],
    }).compile();

    gateway = module.get<SignalsGateway>(SignalsGateway);
    gateway.server = new Server();
    // @ts-expect-error, testing purposes
    gateway.logger.debug = jest.fn();
    // @ts-expect-error, testing purposes
    gateway.ioAdapter = ioAdapterMock;
  });
  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
  it('should add the ioAdapter after init', () => {
    gateway.afterInit(gateway.server);
    // @ts-expect-error, testing purposes
    expect(gateway.ioAdapter).toBeInstanceOf(Object);
  });
  it('should handle a authenticated connection', async () => {
    await gateway.handleConnection(clientMock);
    expect(clientMock.join).toHaveBeenCalledWith(
      sessionFixtures.authorized.wallet,
    );
  });
  it('should handle a unauthenticated connection', async () => {
    await gateway.handleConnection({
      request: {
        session: sessionFixtures.unauthorized,
      },
    } as unknown as Socket);
    // @ts-expect-error, testing purposes
    expect(gateway.logger.debug).toHaveBeenCalled();
  });
  it('should log a disconnect', async () => {
    gateway.handleDisconnect(clientMock);
    // @ts-expect-error, testing purposes
    expect(gateway.logger.debug).toHaveBeenCalled();
  });
  it('should handle a link event', async () => {
    await gateway.link({ requestId: 0.1 }, clientMock);
    expect(clientMock.join).toHaveBeenCalledWith(
      sessionFixtures.authorized.wallet,
    );
    expect(globalThis.handleObserver).toBeInstanceOf(Function);
    expect(
      globalThis.handleObserver({ next: jest.fn(), complete: jest.fn() }),
    ).toBeUndefined();
    expect(
      linkEventFn(null, JSON.stringify({ data: { requestId: 0.1 } })),
    ).resolves.toBeUndefined();
    expect(globalThis.handleObserverMap).toBeInstanceOf(Function);
    expect(
      globalThis.handleObserverMap({
        credId: '0.1',
        requestId: 0.1,
        wallet: '0.1',
      }),
    ).toStrictEqual({ data: { credId: '0.1', requestId: 0.1, wallet: '0.1' } });
  });
  it('should signal a offer-description', async () => {
    await gateway.onOfferDescription(sdpFixtures.call, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientMock.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'offer-description',
      sdpFixtures.call,
    );
  });
  it('should signal a offer-candidate', async () => {
    await gateway.onOfferCandidate(candidateFixture, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientMock.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'offer-candidate',
      candidateFixture,
    );
  });
  it('should signal a answer-description', async () => {
    await gateway.onAnswerDescription(sdpFixtures.answer, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientMock.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'answer-description',
      sdpFixtures.answer,
    );
  });
  it('should signal a answer-candidate', async () => {
    await gateway.onAnswerCandidate(candidateFixture, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientMock.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'answer-candidate',
      candidateFixture,
    );
  });
  it('should reject a failed session reload', async () => {
    //@ts-expect-error, testing purposes
    sessionFixtures.authorized.reload = jest.fn(async (fn) =>
      fn(new Error('failed')),
    );
    await expect(
      reloadSession(sessionFixtures.authorized as unknown as Session),
    ).rejects.toThrowError('failed');
  });
});
