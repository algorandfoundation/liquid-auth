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
import {
  PairingAuthorizationError,
  PairingService,
} from '../pairings/pairing.service.js';
import { mockPairingService } from '../__mocks__/pairing.service.mock.js';
import { firstValueFrom } from 'rxjs';
import { WsException } from '@nestjs/websockets';

const clientMock = {
  request: {
    session: sessionFixtures.authorized,
    sessionID: 'authorized-session-id',
  },
  rooms: new Set(),
  join: jest.fn(),
} as unknown as Socket;
let linkEventFn: any;
let socketMiddleware: any;
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
        to: jest.fn().mockReturnThis(),
        use: jest.fn((fn) => {
          socketMiddleware = fn;
        }),
        socketsJoin: jest.fn(),
        disconnectSockets: jest.fn(),
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
          provide: PairingService,
          useValue: mockPairingService,
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
  it('should authenticate a durable pairing during the socket handshake', async () => {
    gateway.afterInit(gateway.server);
    const next = jest.fn();
    const socket = {
      handshake: {
        auth: {
          version: 2,
          pairingId: 'pairing-123456789',
          role: 'provider',
          credential: 'provider-credential',
        },
      },
      data: {},
    };
    await socketMiddleware(socket, next);
    expect(mockPairingService.authenticateCredential).toHaveBeenCalledWith(
      'pairing-123456789',
      'provider',
      'provider-credential',
    );
    expect(socket.data).toEqual({
      liquidPairing: expect.objectContaining({
        pairingId: 'pairing-123456789',
        role: 'provider',
        credential: 'provider-credential',
      }),
    });
    expect(next).toHaveBeenCalledWith();
  });
  it.each([
    [
      'invalid',
      new PairingAuthorizationError(
        'PAIRING_UNAUTHORIZED',
        'Invalid pairing credentials',
      ),
      'PAIRING_UNAUTHORIZED',
    ],
    [
      'revoked',
      new PairingAuthorizationError(
        'PAIRING_REVOKED',
        'Pairing has been revoked',
      ),
      'PAIRING_REVOKED',
    ],
  ])(
    'should return a machine-readable %s pairing handshake error',
    async (_reason, failure, code) => {
      gateway.afterInit(gateway.server);
      mockPairingService.authenticateCredential.mockRejectedValueOnce(failure);
      const next = jest.fn();
      await socketMiddleware(
        {
          handshake: {
            auth: {
              version: 2,
              pairingId: 'pairing-123456789',
              role: 'provider',
              credential: 'provider-credential',
            },
          },
          data: {},
        },
        next,
      );
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ data: { code } }),
      );
    },
  );
  it('should leave backend handshake failures transient and un-coded', async () => {
    gateway.afterInit(gateway.server);
    const failure = new Error('MongoDB is unavailable');
    mockPairingService.authenticateCredential.mockRejectedValueOnce(failure);
    const next = jest.fn();
    await socketMiddleware(
      {
        handshake: {
          auth: {
            version: 2,
            pairingId: 'pairing-123456789',
            role: 'provider',
            credential: 'provider-credential',
          },
        },
        data: {},
      },
      next,
    );
    expect(next).toHaveBeenCalledWith(failure);
    expect((failure as Error & { data?: unknown }).data).toBeUndefined();
  });
  it('should broadcast revocation and disconnect pairing sockets across instances', async () => {
    gateway.afterInit(gateway.server);
    await linkEventFn(
      'auth',
      JSON.stringify({
        data: {
          type: 'pairing:revoked',
          version: 2,
          pairingId: 'pairing-123456789',
          status: 'revoked',
        },
      }),
    );
    expect(gateway.server.to).toHaveBeenCalledWith('pairing:pairing-123456789');
    expect(gateway.server.emit).toHaveBeenCalledWith('pairing:revoked', {
      version: 2,
      pairingId: 'pairing-123456789',
      status: 'revoked',
    });
    expect(gateway.server.in).toHaveBeenCalledWith('pairing:pairing-123456789');
    expect(gateway.server.disconnectSockets).toHaveBeenCalledWith(true);
  });
  it('should join durable pair and role rooms on every connection', async () => {
    const join = jest.fn();
    await gateway.handleConnection({
      data: {
        liquidPairing: {
          version: 2,
          pairingId: 'pairing-123456789',
          role: 'controller',
          credential: 'controller-credential',
          status: 'active',
        },
      },
      request: {},
      rooms: new Set(),
      join,
    } as unknown as Socket);
    expect(join).toHaveBeenCalledWith('pairing:pairing-123456789');
    expect(join).toHaveBeenCalledWith('pairing:pairing-123456789:controller');
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
    gateway.handleDisconnect(clientMock);
    // @ts-expect-error, testing purposes
    expect(gateway.logger.debug).toHaveBeenCalled();
  });
  it('should handle a link event', async () => {
    const obs = await gateway.link(
      { requestId: '019097ff-bb8c-7d5d-9822-7c9eb2c0d419' },
      clientMock,
    );
    obs.subscribe();

    await linkEventFn(
      'auth',
      JSON.stringify({
        data: {
          requestId: '019097ff-bb8c-7d5d-9822-7c9eb2c0d419',
          wallet: sessionFixtures.authorized.wallet,
        },
      }),
    );
    expect((sessionFixtures.authorized as any).reload).toHaveBeenCalled();
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
  it('should resolve an already-approved durable link immediately from storage', async () => {
    mockPairingService.findActivePairing.mockResolvedValueOnce({
      pairingId: 'pairing-123456789',
      wallet: 'WALLET',
      approvingCredentialId: 'credential-id',
    } as any);
    const join = jest.fn();
    const client = {
      data: {
        liquidPairing: {
          version: 2,
          pairingId: 'pairing-123456789',
          role: 'provider',
          credential: 'provider-credential',
          status: 'active',
        },
      },
      request: {},
      rooms: new Set(),
      join,
    } as unknown as Socket;
    const response = await firstValueFrom(
      await gateway.link({ requestId: 'pairing-123456789' }, client),
    );
    expect(response).toEqual({
      data: {
        version: 2,
        pairingId: 'pairing-123456789',
        requestId: 'pairing-123456789',
        wallet: 'WALLET',
        credId: 'credential-id',
      },
    });
    expect(join).toHaveBeenCalledWith('pairing:pairing-123456789:provider');
  });
  it.each([
    ['PAIRING_UNAUTHORIZED', 'Invalid pairing credentials'],
    ['PAIRING_REVOKED', 'Pairing has been revoked'],
  ] as const)(
    'should emit a structured %s error for terminal link authorization failures',
    async (code, message) => {
      mockPairingService.authenticateCredential.mockRejectedValueOnce(
        new PairingAuthorizationError(code, message),
      );
      const client = {
        data: {
          liquidPairing: {
            version: 2,
            pairingId: 'pairing-123456789',
            role: 'provider',
            credential: 'provider-credential',
            status: 'pending',
          },
        },
        request: {},
        rooms: new Set(),
        join: jest.fn(),
      } as unknown as Socket;

      let failure: unknown;
      try {
        await gateway.link({ requestId: 'pairing-123456789' }, client);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeInstanceOf(WsException);
      expect((failure as WsException).getError()).toEqual({
        status: 'error',
        code,
        message,
        error: message,
        cause: {
          pattern: 'link',
          data: { requestId: 'pairing-123456789' },
        },
      });
    },
  );
  it('should classify a role or request mismatch as unauthorized', async () => {
    const client = {
      data: {
        liquidPairing: {
          version: 2,
          pairingId: 'pairing-123456789',
          role: 'controller',
          credential: 'controller-credential',
          status: 'active',
        },
      },
      request: {},
      rooms: new Set(),
      join: jest.fn(),
    } as unknown as Socket;

    let failure: unknown;
    try {
      await gateway.link({ requestId: 'pairing-123456789' }, client);
    } catch (error) {
      failure = error;
    }
    expect((failure as WsException).getError()).toMatchObject({
      code: 'PAIRING_UNAUTHORIZED',
      cause: { pattern: 'link' },
    });
  });
  it('should leave link database failures generic and retryable', async () => {
    const backendFailure = new Error('MongoDB is unavailable');
    mockPairingService.authenticateCredential.mockRejectedValueOnce(
      backendFailure,
    );
    const client = {
      data: {
        liquidPairing: {
          version: 2,
          pairingId: 'pairing-123456789',
          role: 'provider',
          credential: 'provider-credential',
          status: 'pending',
        },
      },
      request: {},
      rooms: new Set(),
      join: jest.fn(),
    } as unknown as Socket;

    await expect(
      gateway.link({ requestId: 'pairing-123456789' }, client),
    ).rejects.toBe(backendFailure);
    expect((backendFailure as Error & { code?: unknown }).code).toBeUndefined();
  });
  it('should recover if approval lands while the durable link listener is attaching', async () => {
    mockPairingService.findActivePairing
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        pairingId: 'pairing-123456789',
        wallet: 'WALLET',
        approvingCredentialId: 'credential-id',
      } as any);
    const client = {
      data: {
        liquidPairing: {
          version: 2,
          pairingId: 'pairing-123456789',
          role: 'provider',
          credential: 'provider-credential',
          status: 'pending',
        },
      },
      request: {},
      rooms: new Set(),
      join: jest.fn(),
    } as unknown as Socket;
    const response = await firstValueFrom(
      await gateway.link({ requestId: 'pairing-123456789' }, client),
    );
    expect(response.data).toMatchObject({
      version: 2,
      pairingId: 'pairing-123456789',
      wallet: 'WALLET',
    });
    expect(ioAdapterMock.subClient.off).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
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
  it('should route durable pairing signals only to the opposite role', async () => {
    const pairingClient = {
      data: {
        liquidPairing: {
          version: 2,
          pairingId: 'pairing-123456789',
          role: 'provider',
          credential: 'provider-credential',
          status: 'active',
        },
      },
      request: {},
      rooms: new Set(),
    } as unknown as Socket;
    await gateway.onOfferDescription(sdpFixtures.call, pairingClient);
    expect(gateway.server.to).toHaveBeenCalledWith(
      'pairing:pairing-123456789:controller',
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
