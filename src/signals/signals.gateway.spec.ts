import { Test, TestingModule } from '@nestjs/testing';
import {
  SignalsGateway,
  claimedWalletFromSession,
  reloadSession,
  saveSession,
  sessionOwnsWalletBinding,
  touchSession,
} from './signals.gateway.js';
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
  data: {},
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
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { data: { sessionId: 'a' } },
      { data: { sessionId: 'b' } },
    ]);
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
      data: {},
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
      { data: { sessionId: 'a' } },
      { data: { sessionId: 'b' } },
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
  it('should count the same device once even with multiple sockets', async () => {
    // A single device (session) that reconnects can briefly own more than one
    // socket in the room. Presence must collapse them by session id so the
    // device is only ever counted once, no matter how it reconnects.
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { data: { sessionId: 'same-device' } },
      { data: { sessionId: 'same-device' } },
    ]);
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    await expect(gateway.countDevices(requestId)).resolves.toBe(1);
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
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { data: { sessionId: 'a' } },
      { data: { sessionId: 'b' } },
    ]);
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
    // A presence query is a pure read: it must NOT persist the requestId onto
    // the querying client's session, otherwise that client would auto-join the
    // requestId room on its next (re)connect and be counted as a device even
    // though it never linked and cannot receive a connection.
    expect((sessionFixtures.authorized as any).save).not.toHaveBeenCalled();
    expect((sessionFixtures.authorized as any).requestId).toBeUndefined();
  });
  it('should handle a link event', async () => {
    const obs = await gateway.link(
      { requestId: '019097ff-bb8c-7d5d-9822-7c9eb2c0d419' },
      clientMock,
    );
    obs.subscribe();

    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { data: { sessionId: 'a' } },
      { data: { sessionId: 'b' } },
    ]);
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
  it('should not re-claim a session already claimed by a wallet credential on link', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    // A wallet session: it authenticated with its own credential (credId), so
    // the link rendezvous must never re-bind it to the announced wallet — the
    // announce can carry a stale address recorded on the other peer's session.
    const walletSession = {
      wallet: sessionFixtures.authorized.wallet,
      credId: 'wallet-cred-id',
      reload: jest.fn(async (fn: any) => fn(null)),
      save: jest.fn(),
    };
    const walletClient = {
      request: { session: walletSession, sessionID: 'wallet-session-id' },
      rooms: new Set(),
      join: jest.fn(),
      data: {},
    } as unknown as Socket;
    const obs = await gateway.link({ requestId }, walletClient);
    obs.subscribe();

    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { data: { sessionId: 'a' } },
    ]);
    await linkEventFn(
      'auth',
      JSON.stringify({
        data: {
          requestId,
          wallet: 'STALEWALLETFROMTHEOTHERPEERSSESSIONXXXXXXXXXXXXXXXXXXXXXXX',
          sessionId: 'agent-session-id',
        },
      }),
    );
    // The wallet binding is left untouched and the stale wallet room is not
    // joined…
    expect(
      (gateway as any).authService.updateSessionWallet,
    ).not.toHaveBeenCalled();
    expect(walletClient.join).not.toHaveBeenCalledWith(
      'STALEWALLETFROMTHEOTHERPEERSSESSIONXXXXXXXXXXXXXXXXXXXXXXX',
    );
    // …while presence for the requestId is still refreshed and the link
    // resolves normally.
    expect(gateway.server.socketsJoin).toHaveBeenCalledWith(requestId);
    expect((walletSession as any).deviceCount).toBe(1);
  });
  it('should refuse a link for a requestId another wallet is still holding', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    // A requestId is a hint, not a secret: it is long-lived (peers renegotiate
    // over it) and travels through QR codes, logs and UIs. A wallet that knows
    // one must not be able to take over the pairing while another wallet still
    // holds it.
    const otherWallet =
      'OTHERWALLETCLAIMEDTHISREQUESTIDXXXXXXXXXXXXXXXXXXXXXXXXXX';
    (gateway as any).authService.findWalletClaimsByRequestId = jest
      .fn()
      .mockResolvedValue([
        { sessionId: 'holder-session-id', wallet: otherWallet, credId: 'held' },
      ]);
    // The holder is online: its session still owns a socket.
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { data: { sessionId: 'holder-session-id' } },
    ]);
    const intruderSession = {
      wallet: sessionFixtures.authorized.wallet,
      credId: 'intruder-cred-id',
      reload: jest.fn(async (fn: any) => fn(null)),
      save: jest.fn(),
    };
    const intruderClient = {
      request: { session: intruderSession, sessionID: 'intruder-session-id' },
      rooms: new Set(),
      join: jest.fn(),
      data: {},
    } as unknown as Socket;
    const obs = await gateway.link({ requestId }, intruderClient);
    // Refused silently: no observable to resolve, no room, no presence — the
    // caller learns nothing about the connection it tried to take over.
    expect(obs).toBeUndefined();
    expect(intruderClient.join).not.toHaveBeenCalled();
    expect(gateway.server.emit).not.toHaveBeenCalled();
    expect(ioAdapterMock.subClient.subscribe).not.toHaveBeenCalled();
  });
  it('should link for a requestId whose other claim is no longer online', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    // Stored claims outlive the wallet that made them: after a re-onboarding
    // the wallet comes back to the same (persistent) requestId with a new
    // address and credential. An abandoned claim must never lock it out.
    (gateway as any).authService.findWalletClaimsByRequestId = jest
      .fn()
      .mockResolvedValue([
        {
          sessionId: 'abandoned-session-id',
          wallet: 'WALLETFROMBEFORETHEREONBOARDINGXXXXXXXXXXXXXXXXXXXXXXXXXX',
          credId: 'abandoned',
        },
      ]);
    const walletSession = {
      wallet: sessionFixtures.authorized.wallet,
      credId: 'fresh-cred-id',
      reload: jest.fn(async (fn: any) => fn(null)),
      save: jest.fn(),
    };
    const walletClient = {
      request: { session: walletSession, sessionID: 'wallet-session-id' },
      rooms: new Set(),
      join: jest.fn(),
      data: {},
    } as unknown as Socket;
    // fetchSockets defaults to [] — the abandoned claim has no live socket.
    const obs = await gateway.link({ requestId }, walletClient);
    expect(obs).toBeDefined();
    expect(walletClient.join).toHaveBeenCalledWith(requestId);
  });
  it('should not gate a link from a session without a credential of its own', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    // The agent side has no credential — an anonymous session IS the
    // legitimate peer role here, so the claim gate must not even be consulted
    // for it.
    (gateway as any).authService.findWalletClaimsByRequestId = jest.fn();
    const obs = await gateway.link({ requestId }, clientMock);
    expect(obs).toBeDefined();
    expect(
      (gateway as any).authService.findWalletClaimsByRequestId,
    ).not.toHaveBeenCalled();
  });
  it('should not treat the same wallet on another device as a conflicting claim', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    // A wallet key may live on several devices; those are the same party.
    (gateway as any).authService.findWalletClaimsByRequestId = jest
      .fn()
      .mockResolvedValue([
        {
          sessionId: 'other-device-session-id',
          wallet: sessionFixtures.authorized.wallet,
          credId: 'other-device',
        },
      ]);
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { data: { sessionId: 'other-device-session-id' } },
    ]);
    await expect(
      gateway.findLiveWalletClaimConflict(
        requestId,
        sessionFixtures.authorized.wallet,
        'wallet-session-id',
      ),
    ).resolves.toBeNull();
  });
  it('should tolerate an empty requestId and a failing claim lookup', async () => {
    await expect(
      gateway.findLiveWalletClaimConflict('', 'WALLET'),
    ).resolves.toBeNull();
    // @ts-expect-error, testing purposes
    gateway.logger.error = jest.fn();
    (gateway as any).authService.findWalletClaimsByRequestId = jest
      .fn()
      .mockRejectedValue(new Error('mongo is down'));
    // Availability over strictness: a failed lookup must not break linking.
    await expect(
      gateway.findLiveWalletClaimConflict('request-id', 'WALLET'),
    ).resolves.toBeNull();
    // @ts-expect-error, testing purposes
    expect(gateway.logger.error).toHaveBeenCalled();
  });
  it('should read the claimed wallet from the live or the stored session', () => {
    expect(
      claimedWalletFromSession({ credId: 'cred', wallet: 'WALLET' }, undefined),
    ).toBe('WALLET');
    expect(
      claimedWalletFromSession({}, {
        session: JSON.stringify({ credId: 'cred', wallet: 'STORED' }),
      } as any),
    ).toBe('STORED');
    // A wallet address without a credential is hearsay (this is what the link
    // rendezvous writes onto the agent's session), never a claim.
    expect(
      claimedWalletFromSession({ wallet: 'WALLET' }, undefined),
    ).toBeNull();
    expect(claimedWalletFromSession({ credId: 'cred' }, undefined)).toBeNull();
    expect(claimedWalletFromSession(undefined, undefined)).toBeNull();
    expect(
      claimedWalletFromSession({}, { session: 'not-json' } as any),
    ).toBeNull();
  });
  it('should detect a wallet-claimed session from the stored session document', () => {
    // Live session lacking the credId (e.g. loaded before the HTTP assertion
    // completed) still counts as claimed when the stored document carries it.
    expect(
      sessionOwnsWalletBinding({}, {
        session: JSON.stringify({ credId: 'cred', wallet: 'WALLET' }),
      } as any),
    ).toBe(true);
    expect(sessionOwnsWalletBinding({ credId: 'cred' }, undefined)).toBe(true);
    // Sessions without a credential (agents) are not claimed.
    expect(sessionOwnsWalletBinding({}, { session: '{}' } as any)).toBe(false);
    expect(sessionOwnsWalletBinding(undefined, undefined)).toBe(false);
    // Unparseable stored payloads are tolerated.
    expect(sessionOwnsWalletBinding({}, { session: 'not-json' } as any)).toBe(
      false,
    );
  });
  it('should re-announce auth on link when a wallet is genuinely present', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    (gateway as any).authService.findAuthenticatedSessionsByRequestId = jest
      .fn()
      .mockResolvedValue([
        {
          sessionId: 'wallet-session-id',
          wallet: sessionFixtures.authorized.wallet,
        },
      ]);
    // The wallet's own session still owns a live socket → genuinely present.
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([{}]);
    await gateway.reannounceIfWalletPresent(requestId);
    expect(gateway.server.in).toHaveBeenCalledWith('wallet-session-id');
    expect((gateway as any).client.emit).toHaveBeenCalledWith('auth', {
      requestId,
      wallet: sessionFixtures.authorized.wallet,
      sessionId: 'wallet-session-id',
    });
  });
  it('should skip a stale wallet session and re-announce the live one', async () => {
    // Repeated restarts leave several sessions carrying the same requestId +
    // wallet; only the last owns a live socket. The re-announce must skip the
    // dead one(s) instead of bailing on the first match, otherwise the linking
    // peer's `auth` never fires and its `link` hangs forever.
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    (gateway as any).authService.findAuthenticatedSessionsByRequestId = jest
      .fn()
      .mockResolvedValue([
        {
          sessionId: 'stale-session-id',
          wallet: sessionFixtures.authorized.wallet,
        },
        {
          sessionId: 'live-session-id',
          wallet: sessionFixtures.authorized.wallet,
        },
      ]);
    // First candidate has no live socket (stale), second is genuinely present.
    (gateway.server.fetchSockets as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{}]);
    await gateway.reannounceIfWalletPresent(requestId);
    expect(gateway.server.in).toHaveBeenCalledWith('stale-session-id');
    expect(gateway.server.in).toHaveBeenCalledWith('live-session-id');
    expect((gateway as any).client.emit).toHaveBeenCalledTimes(1);
    expect((gateway as any).client.emit).toHaveBeenCalledWith('auth', {
      requestId,
      wallet: sessionFixtures.authorized.wallet,
      sessionId: 'live-session-id',
    });
  });
  it('should kick out stale sessions bound to the same credential', async () => {
    const credId = 'a-credential-id';
    (gateway as any).authService.findSessionsByCredId = jest
      .fn()
      .mockResolvedValue(['stale-session']);
    const disconnect = jest.fn();
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { disconnect },
    ]);
    await gateway.evictDuplicateCredentialSessions(credId, 'new-session');
    expect(
      (gateway as any).authService.findSessionsByCredId,
    ).toHaveBeenCalledWith(credId, 'new-session');
    expect(gateway.server.in).toHaveBeenCalledWith('stale-session');
    expect(disconnect).toHaveBeenCalledWith(true);
  });
  it('should evict duplicate credential sessions on a global auth event with a credId', async () => {
    const credId = 'a-credential-id';
    const evictSpy = jest
      .spyOn(gateway, 'evictDuplicateCredentialSessions')
      .mockResolvedValue();
    gateway.afterInit(gateway.server);
    await linkEventFn(
      'auth',
      JSON.stringify({
        sessionId: 'new-session',
        wallet: sessionFixtures.authorized.wallet,
        credId,
      }),
    );
    expect(evictSpy).toHaveBeenCalledWith(credId, 'new-session');
  });
  it('should not evict when the auth event carries no credId', async () => {
    const evictSpy = jest
      .spyOn(gateway, 'evictDuplicateCredentialSessions')
      .mockResolvedValue();
    gateway.afterInit(gateway.server);
    await linkEventFn(
      'auth',
      JSON.stringify({
        sessionId: 'wallet-session-id',
        wallet: sessionFixtures.authorized.wallet,
      }),
    );
    expect(evictSpy).not.toHaveBeenCalled();
  });
  it('should not re-announce auth on link when no wallet session exists', async () => {
    (gateway as any).authService.findAuthenticatedSessionsByRequestId = jest
      .fn()
      .mockResolvedValue([]);
    await gateway.reannounceIfWalletPresent(
      '019097ff-bb8c-7d5d-9822-7c9eb2c0d419',
    );
    expect((gateway as any).client.emit).not.toHaveBeenCalled();
  });
  it('should not re-announce auth on link when the wallet is offline', async () => {
    (gateway as any).authService.findAuthenticatedSessionsByRequestId = jest
      .fn()
      .mockResolvedValue([
        {
          sessionId: 'wallet-session-id',
          wallet: sessionFixtures.authorized.wallet,
        },
      ]);
    // No live socket for the wallet session → not present, must not resolve.
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([]);
    await gateway.reannounceIfWalletPresent(
      '019097ff-bb8c-7d5d-9822-7c9eb2c0d419',
    );
    expect((gateway as any).client.emit).not.toHaveBeenCalled();
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
      data: {},
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
      data: {},
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
  it('should reject a failed session save', async () => {
    const session = {
      save: jest.fn((fn: any) => fn(new Error('failed'))),
    };
    await expect(saveSession(session as unknown as Session)).rejects.toThrow(
      'failed',
    );
  });
  it('should still acknowledge a link when the stored session expired mid-wait', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    const obs = await gateway.link({ requestId }, clientMock);
    const next = jest.fn();
    const complete = jest.fn();
    obs.subscribe({ next, complete });
    // The stored session document aged out of the store while the link was
    // parked (an idle websocket carries no HTTP traffic to refresh it), so
    // the wallet re-bind path fails on the session reload…
    (sessionFixtures.authorized as any).reload = jest.fn(async (fn: any) =>
      fn(new Error('failed to load session')),
    );
    // @ts-expect-error, testing purposes
    gateway.logger.warn = jest.fn();
    (gateway.server.fetchSockets as jest.Mock).mockResolvedValueOnce([
      { data: { sessionId: 'a' } },
      { data: { sessionId: 'b' } },
    ]);
    await linkEventFn(
      'auth',
      JSON.stringify({
        data: {
          requestId,
          wallet: sessionFixtures.authorized.wallet,
          sessionId: 'wallet-session-id',
        },
      }),
    );
    // …but the rendezvous must not die silently: the peer still receives its
    // acknowledgement (so it can arm its offer listener and answer the
    // returning wallet) and the failure is only logged.
    expect(next).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId,
        wallet: sessionFixtures.authorized.wallet,
      }),
    });
    expect(complete).toHaveBeenCalled();
    expect(ioAdapterMock.subClient.off).toHaveBeenCalled();
    // @ts-expect-error, testing purposes
    expect(gateway.logger.warn).toHaveBeenCalled();
  });
  it('should recreate a missing stored session on link instead of refusing silently', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    // The linking peer's stored session expired while it sat idle. The live
    // express session is still on the socket, so link must re-save it (the
    // store upserts, recreating the document) and carry on — bailing out
    // would leave the caller parked on an acknowledgement that never comes.
    const liveSession = {
      reload: jest.fn(async (fn: any) => fn(null)),
      save: jest.fn((fn?: any) => fn && fn(null)),
    };
    const client = {
      request: { session: liveSession, sessionID: 'expired-session-id' },
      rooms: new Set(),
      join: jest.fn(),
      data: {},
    } as unknown as Socket;
    (gateway as any).authService.findSession = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(sessionFixtures.authorized);
    // @ts-expect-error, testing purposes
    gateway.logger.warn = jest.fn();
    const obs = await gateway.link({ requestId }, client);
    expect(liveSession.save).toHaveBeenCalled();
    expect((gateway as any).authService.findSession).toHaveBeenCalledTimes(2);
    expect(obs).toBeDefined();
    expect(client.join).toHaveBeenCalledWith(requestId);
  });
  it('should still relay an offer-description when the session reload fails', async () => {
    const requestId = '019097ff-bb8c-7d5d-9822-7c9eb2c0d419';
    (clientMock.request as any).session.requestId = requestId;
    // The sender's stored session expired; the in-memory session still knows
    // the requestId, so the relay must go on instead of dying on the reload
    // and silently swallowing the offer.
    (sessionFixtures.authorized as any).reload = jest.fn(async (fn: any) =>
      fn(new Error('failed to load session')),
    );
    // @ts-expect-error, testing purposes
    gateway.logger.warn = jest.fn();
    await gateway.onOfferDescription(sdpFixtures.call, clientMock);
    expect(gateway.server.in).toHaveBeenCalledWith(requestId);
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'offer-description',
      sdpFixtures.call,
    );
    // @ts-expect-error, testing purposes
    expect(gateway.logger.warn).toHaveBeenCalled();
  });
  describe('session keep-alive', () => {
    it('should touch each connected session once via the store', async () => {
      const touch = jest.fn((sid: string, session: unknown, cb: any) =>
        cb(null),
      );
      const makeSocket = (sessionID: string) => ({
        request: {
          sessionID,
          session: { save: jest.fn((fn?: any) => fn && fn(null)) },
          sessionStore: { touch },
        },
      });
      (gateway.server as any).sockets.sockets = new Map([
        ['socket-1', makeSocket('session-a')],
        // Same device, second socket: touched once.
        ['socket-2', makeSocket('session-a')],
        ['socket-3', makeSocket('session-b')],
      ]);
      await expect(gateway.touchConnectedSessions()).resolves.toBe(2);
      expect(touch).toHaveBeenCalledTimes(2);
    });
    it('should recreate a session the store can no longer touch', async () => {
      // The store refuses to touch a document it cannot find (it already
      // expired) — the fallback save upserts, recreating it.
      const save = jest.fn((fn?: any) => fn && fn(null));
      (gateway.server as any).sockets.sockets = new Map([
        [
          'socket-1',
          {
            request: {
              sessionID: 'expired-session-id',
              session: { save },
              sessionStore: {
                touch: jest.fn((sid: string, session: unknown, cb: any) =>
                  cb(new Error('Unable to find the session to touch')),
                ),
              },
            },
          },
        ],
      ]);
      await expect(gateway.touchConnectedSessions()).resolves.toBe(1);
      expect(save).toHaveBeenCalled();
    });
    it('should tolerate a socket without a session and a failing touch', async () => {
      // @ts-expect-error, testing purposes
      gateway.logger.warn = jest.fn();
      (gateway.server as any).sockets.sockets = new Map([
        ['socket-1', { request: {} }],
        [
          'socket-2',
          {
            request: {
              sessionID: 'broken-session-id',
              session: {
                save: jest.fn(
                  (fn?: any) => fn && fn(new Error('mongo is down')),
                ),
              },
              sessionStore: {
                touch: jest.fn((sid: string, session: unknown, cb: any) =>
                  cb(new Error('mongo is down')),
                ),
              },
            },
          },
        ],
      ]);
      // The broken session is counted as attempted but never throws out of
      // the sweep — the remaining sockets must still be touched next time.
      await expect(gateway.touchConnectedSessions()).resolves.toBe(1);
      // @ts-expect-error, testing purposes
      expect(gateway.logger.warn).toHaveBeenCalled();
    });
    it('should fall back to save when the request has no store', async () => {
      const save = jest.fn((fn?: any) => fn && fn(null));
      await touchSession({ sessionID: 'no-store', session: { save } });
      expect(save).toHaveBeenCalled();
    });
    it('should arm the sweep on init and disarm it on module destroy', () => {
      jest.useFakeTimers();
      try {
        const touchSpy = jest
          .spyOn(gateway, 'touchConnectedSessions')
          .mockResolvedValue(0);
        gateway.afterInit(gateway.server);
        jest.advanceTimersByTime(60 * 60 * 1000);
        expect(touchSpy).toHaveBeenCalledTimes(1);
        gateway.onModuleDestroy();
        jest.advanceTimersByTime(60 * 60 * 1000);
        expect(touchSpy).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    });
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
