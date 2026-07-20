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
    sessionID: 'authorized-session-id',
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
        socketsJoin: jest.fn(),
        fetchSockets: jest.fn().mockResolvedValue([]),
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
    jest.clearAllMocks();
    userModel = mongoose.model('User', UserSchema);
    Object.keys(sessionFixtures).forEach((key) => {
      sessionFixtures[key].reload = jest.fn(async (fn) => fn(null));
      sessionFixtures[key].save = jest.fn();
      delete sessionFixtures[key].requestId;
      delete sessionFixtures[key].deviceCount;
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
        {
          provide: 'ACCOUNT_LINK_SERVICE',
          useValue: { emit: jest.fn() },
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
  it('should join an authenticated session to the requestId room on a global auth event', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([{}, {}]);
    gateway.afterInit(gateway.server);
    await linkEventFn(
      'auth',
      JSON.stringify({
        sessionId: 'wallet-session-id',
        wallet: sessionFixtures.authorized.wallet,
        requestId,
      }),
    );
    expect(gateway.server.in).toHaveBeenCalledWith('wallet-session-id');
    expect(gateway.server.socketsJoin).toHaveBeenCalledWith(requestId);
    expect(gateway.server.emit).toHaveBeenCalledWith('presence', {
      requestId,
      deviceCount: 2,
      online: true,
    });
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
        sessionID: 'unauthorized-session-id',
      },
      join: jest.fn(),
    } as unknown as Socket);
    // @ts-expect-error, testing purposes
    expect(gateway.logger.debug).toHaveBeenCalled();
  });
  it('should log a disconnect', async () => {
    await gateway.handleDisconnect(clientMock);
    // @ts-expect-error, testing purposes
    expect(gateway.logger.debug).toHaveBeenCalled();
  });
  it('should return 0 presence for an empty requestId', async () => {
    await expect(gateway.updatePresence('')).resolves.toBe(0);
  });
  it('should count devices and persist presence to the session', async () => {
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      {},
      {},
    ]);
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    const deviceCount = await gateway.updatePresence(
      requestId,
      sessionFixtures.authorized as any,
    );
    expect(deviceCount).toBe(2);
    expect(gateway.server.in).toHaveBeenCalledWith(requestId);
    expect(gateway.server.emit).toHaveBeenCalledWith('presence', {
      requestId,
      deviceCount: 2,
      online: true,
    });
    expect((sessionFixtures.authorized as any).requestId).toBe(requestId);
    expect((sessionFixtures.authorized as any).deviceCount).toBe(2);
    expect((sessionFixtures.authorized as any).save).toHaveBeenCalled();
  });
  it('should refresh presence on disconnect when a requestId is present', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    const session = { requestId, save: jest.fn() };
    const updatePresenceSpy = jest.spyOn(gateway, 'updatePresence');
    await gateway.handleDisconnect({
      request: {
        session,
        sessionID: 'authorized-session-id',
      },
    } as unknown as Socket);
    expect(updatePresenceSpy).toHaveBeenCalledWith(requestId, session);
    expect(session.save).toHaveBeenCalled();
  });
  it('should respond to a presence request', async () => {
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([{}, {}]);
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    const result = await gateway.onPresence({ requestId }, clientMock);
    expect(result).toStrictEqual({
      requestId,
      deviceCount: 2,
      online: true,
    });
    expect(gateway.server.emit).toHaveBeenCalledWith('presence', {
      requestId,
      deviceCount: 2,
      online: true,
    });
  });
  it('should handle a link event', async () => {
    const obs = await gateway.link(
      { requestId: '019097ff-bb8c-7d5d-9822-7c9eb2c0d419' },
      clientMock,
    );
    obs.subscribe();

    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([{}, {}]);
    await linkEventFn(
      'auth',
      JSON.stringify({
        data: {
          requestId: '019097ff-bb8c-7d5d-9822-7c9eb2c0d419',
          wallet: sessionFixtures.authorized.wallet,
          sessionId: 'wallet-session-id',
        },
      }),
    );
    expect((sessionFixtures.authorized as any).reload).toHaveBeenCalled();
    // Presence: the wallet joins the requestId room and the offer session's
    // device count is refreshed so /auth/session reflects every device.
    expect(gateway.server.socketsJoin).toHaveBeenCalledWith(
      '019097ff-bb8c-7d5d-9822-7c9eb2c0d419',
    );
    expect((sessionFixtures.authorized as any).deviceCount).toBe(2);
    expect((sessionFixtures.authorized as any).save).toHaveBeenCalled();
    expect(globalThis.handleObserver).toBeInstanceOf(Function);
    expect(
      globalThis.handleObserver({ next: jest.fn(), complete: jest.fn() }),
    ).toBeInstanceOf(Function);
    expect(
      linkEventFn(
        null,
        JSON.stringify({
          data: { requestId: '019097ff-bb8c-7d5d-9822-7c9eb2c0d419' },
        }),
      ),
    ).resolves.toBeUndefined();
    expect(globalThis.handleObserverMap).toBeInstanceOf(Function);
    expect(
      globalThis.handleObserverMap({
        credId: '0.1',
        requestId: '019097ff-bb8c-7d5d-9822-7c9eb2c0d419',
        wallet: '0.1',
      }),
    ).toStrictEqual({
      data: {
        credId: '0.1',
        requestId: '019097ff-bb8c-7d5d-9822-7c9eb2c0d419',
        wallet: '0.1',
      },
    });
  });
  it('should re-announce auth when an authenticated wallet reconnects for a requestId', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    const session = {
      wallet: sessionFixtures.authorized.wallet,
      requestId,
      reload: jest.fn(async (fn: any) => fn(null)),
      save: jest.fn(),
    };
    await gateway.handleConnection({
      request: { session, sessionID: 'wallet-session-id' },
      rooms: new Set(),
      join: jest.fn(),
    } as unknown as Socket);
    expect((gateway as any).client.emit).toHaveBeenCalledWith('auth', {
      requestId,
      wallet: sessionFixtures.authorized.wallet,
      sessionId: 'wallet-session-id',
    });
  });
  it('should not re-announce auth for an unauthenticated reconnect', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    const session = {
      requestId,
      reload: jest.fn(async (fn: any) => fn(null)),
      save: jest.fn(),
    };
    await gateway.handleConnection({
      request: { session, sessionID: 'unauth-session-id' },
      rooms: new Set(),
      join: jest.fn(),
    } as unknown as Socket);
    expect((gateway as any).client.emit).not.toHaveBeenCalled();
  });
  it('should signal a offer-description', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    (clientMock.request as any).session.requestId = requestId;
    await gateway.onOfferDescription(sdpFixtures.call, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(requestId);
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'offer-description',
      sdpFixtures.call,
    );
  });
  it('should signal a offer-candidate', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    (clientMock.request as any).session.requestId = requestId;
    await gateway.onOfferCandidate(candidateFixture, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(requestId);
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'offer-candidate',
      candidateFixture,
    );
  });
  it('should signal a answer-description', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    (clientMock.request as any).session.requestId = requestId;
    await gateway.onAnswerDescription(sdpFixtures.answer, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(requestId);
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'answer-description',
      sdpFixtures.answer,
    );
  });
  it('should signal a answer-candidate', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    (clientMock.request as any).session.requestId = requestId;
    await gateway.onAnswerCandidate(candidateFixture, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(requestId);
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
    ).rejects.toThrow('failed');
  });
  it('should remove the listener on unsubscription', async () => {
    const obs = await gateway.link(
      { requestId: 'test-request-id' },
      clientMock,
    );
    const subscription = obs.subscribe();
    subscription.unsubscribe();
    expect(ioAdapterMock.subClient.off).toHaveBeenCalled();
  });
});
