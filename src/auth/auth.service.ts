import * as crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { toBase64URL } from '../encoding/index.js';
import { Credential, User } from './auth.schema.js';
import { Session } from './session.schema.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
  ) {}

  /**
   * Initialize a User
   *
   * @param wallet - User ID
   * @throws TypeError - Input Validation Error
   * @throws Error - Database Error
   */
  async init(wallet: string): Promise<User> {
    if (!wallet || !/[a-zA-Z0-9-_]+/.test(wallet)) {
      throw new TypeError('Invalid username');
    }
    let user = await this.find(wallet);
    if (!user) {
      user = await this.create(wallet);
    }
    return user;
  }

  /**
   * Create a New User
   *
   * @param wallet
   */
  async create(wallet: string): Promise<User> {
    const createdUser = new this.userModel({
      id: toBase64URL(crypto.randomBytes(32)),
      wallet,
      credentials: [],
    });
    return createdUser.save();
  }

  /**
   * Find a User
   *
   * @param wallet
   */
  async find(wallet: string): Promise<User> {
    return this.userModel.findOne({ wallet }).exec();
  }
  async search(lookup) {
    return this.userModel.findOne(lookup).exec();
  }
  /**
   * Update a User
   *
   * @param user
   */
  async update(user: User): Promise<User> {
    return this.userModel.findOneAndUpdate({ id: user.id }, user).exec();
  }
  async findCredential(credId: string) {
    const user = await this.userModel
      .findOne<User>({ 'credentials.credId': credId })
      .exec();
    if (user) {
      return user.credentials.find((cred) => cred.credId === credId);
    }
  }
  async addCredential(id: string, credential: Credential) {
    const user = await this.find(id);

    const existingCred = user.credentials.find(
      (cred) => cred.credId === credential.credId,
    );

    if (!existingCred) {
      user.credentials.push(credential);
      await this.update(user);
    }

    return user;
  }
  async removeCredential(user: User, credId: string) {
    user.credentials = user.credentials.filter(
      (cred) => cred.credId !== credId,
    );
    return this.update(user);
  }

  /**
   * Find a Session by ID
   *
   * @param sid - Session ID
   */
  async findSession(sid: string): Promise<Session> {
    this.logger.log(`Finding session ${sid}`);
    return this.sessionModel.findOne({ _id: sid }).exec();
  }

  /**
   * Find ALL authenticated Sessions bound to a requestId
   *
   * Looks up every stored session whose serialized data is tied to the given
   * requestId and already carries an authenticated wallet. Used to drive an
   * order-independent pairing rendezvous: when a peer links for a requestId a
   * wallet has already authenticated for, the caller can re-announce that wallet
   * (gated on live presence) so the peer resolves regardless of who connected
   * first.
   *
   * Returning EVERY match (rather than just the first) is what makes the
   * rendezvous robust to stale duplicate sessions: repeated peer/app restarts
   * accumulate several sessions carrying the same requestId + wallet, only one
   * of which still owns a live socket. The caller can then scan these
   * candidates and re-announce the one that is genuinely present, instead of
   * giving up when the first (possibly dead) match has no socket.
   *
   * @param requestId - The request identifier peers are connecting for
   * @param excludeSessionId - A session id to ignore (e.g. the linking peer's
   *   own session, which after a first pairing also carries the wallet), so the
   *   results identify the OTHER party
   * @returns The wallet + sessionId of every match, in stored order (may be empty)
   */
  async findAuthenticatedSessionsByRequestId(
    requestId: string,
    excludeSessionId?: string,
  ): Promise<{ sessionId: string; wallet: string }[]> {
    if (typeof requestId !== 'string' || requestId.length === 0) {
      return [];
    }
    // The session payload is stored as a JSON string, so narrow the scan with a
    // substring match on the requestId before parsing each candidate.
    const sessions = await this.sessionModel
      .find({ session: { $regex: requestId } })
      .exec();
    const matches: { sessionId: string; wallet: string }[] = [];
    for (const stored of sessions) {
      const sessionId = String(stored._id);
      // Skip the caller's own session so the matches identify the other peer
      // (both peers share the same wallet + requestId after a first pairing).
      if (excludeSessionId && sessionId === excludeSessionId) {
        continue;
      }
      try {
        const data = JSON.parse(stored.session);
        if (
          data &&
          data.requestId === requestId &&
          typeof data.wallet === 'string' &&
          data.wallet.length > 0
        ) {
          matches.push({ sessionId, wallet: data.wallet });
        }
      } catch {
        // Skip sessions whose payload can't be parsed.
      }
    }
    return matches;
  }

  /**
   * Find an authenticated Session bound to a requestId
   *
   * Convenience wrapper over {@link findAuthenticatedSessionsByRequestId} that
   * returns only the first match (or null). Prefer the plural form when the
   * caller needs to skip stale sessions and pick the one that is genuinely
   * present.
   *
   * @param requestId - The request identifier peers are connecting for
   * @param excludeSessionId - A session id to ignore (e.g. the linking peer's
   *   own session)
   * @returns The wallet + sessionId of the first match, otherwise null
   */
  async findAuthenticatedSessionByRequestId(
    requestId: string,
    excludeSessionId?: string,
  ): Promise<{ sessionId: string; wallet: string } | null> {
    const [first] = await this.findAuthenticatedSessionsByRequestId(
      requestId,
      excludeSessionId,
    );
    return first ?? null;
  }

  /**
   * Find every Session that CLAIMED a requestId with its own credential
   *
   * Stricter than {@link findAuthenticatedSessionsByRequestId}: a session only
   * counts when it carries a `credId`, i.e. it completed a FIDO2 ceremony of
   * its own. That distinction matters because a session can carry a wallet
   * address without ever having proven it — the `link` rendezvous writes the
   * announced wallet onto the peer's (agent's) session, and that copy can be
   * stale. Only credential-bearing sessions represent an actual wallet device
   * claiming the requestId.
   *
   * @param requestId - The request identifier peers are connecting for
   * @param excludeSessionId - A session id to ignore (e.g. the caller's own)
   * @returns The wallet + credId + sessionId of every claim (may be empty)
   */
  async findWalletClaimsByRequestId(
    requestId: string,
    excludeSessionId?: string,
  ): Promise<{ sessionId: string; wallet: string; credId: string }[]> {
    if (typeof requestId !== 'string' || requestId.length === 0) {
      return [];
    }
    // The session payload is stored as a JSON string, so narrow the scan with a
    // substring match on the requestId before parsing each candidate.
    const sessions = await this.sessionModel
      .find({ session: { $regex: requestId } })
      .exec();
    const claims: { sessionId: string; wallet: string; credId: string }[] = [];
    for (const stored of sessions) {
      const sessionId = String(stored._id);
      if (excludeSessionId && sessionId === excludeSessionId) {
        continue;
      }
      try {
        const data = JSON.parse(stored.session);
        if (
          data &&
          data.requestId === requestId &&
          typeof data.wallet === 'string' &&
          data.wallet.length > 0 &&
          typeof data.credId === 'string' &&
          data.credId.length > 0
        ) {
          claims.push({ sessionId, wallet: data.wallet, credId: data.credId });
        }
      } catch {
        // Skip sessions whose payload can't be parsed.
      }
    }
    return claims;
  }

  /**
   * Find other sessions bound to the same credential
   *
   * A credential (`credId`) can only ever belong to a single device, so any
   * OTHER stored session that carries the same `credId` must be a stale login
   * from that same device (e.g. a legacy application that re-authenticates on
   * every connection, or a wallet that logs in again). Locating them lets a
   * freshly authenticated session kick them out so the device is always counted
   * once — while leaving other devices that merely share the wallet
   * address untouched (a wallet key may live on many devices).
   *
   * @param credId - The credential id that identifies the device
   * @param excludeSessionId - A session id to ignore (e.g. the freshly
   *   authenticated session, which is the one we want to keep)
   * @returns The session ids of the other sessions bound to the same credential
   */
  async findSessionsByCredId(
    credId: string,
    excludeSessionId?: string,
  ): Promise<string[]> {
    if (typeof credId !== 'string' || credId.length === 0) {
      return [];
    }
    // The session payload is stored as a JSON string, so narrow the scan with a
    // substring match on the credId before parsing each candidate.
    const sessions = await this.sessionModel
      .find({ session: { $regex: credId } })
      .exec();
    const ids: string[] = [];
    for (const stored of sessions) {
      const sessionId = String(stored._id);
      // Keep the freshly authenticated session.
      if (excludeSessionId && sessionId === excludeSessionId) {
        continue;
      }
      try {
        const data = JSON.parse(stored.session);
        if (data && data.credId === credId) {
          ids.push(sessionId);
        }
      } catch {
        // Skip sessions whose payload can't be parsed.
      }
    }
    return ids;
  }

  /**
   * Update Wallet by Session ID
   * @param session - The stored Session
   * @param wallet - The Wallet Address
   */
  async updateSessionWallet(
    session: Session,
    wallet: string,
  ): Promise<Session> {
    const data = JSON.parse(session.session);
    data.wallet = wallet;
    return this.sessionModel
      .findOneAndUpdate(
        { _id: session._id },
        {
          session: JSON.stringify(data),
        },
      )
      .exec();
  }
}
