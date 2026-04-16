import * as express from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { LiquidAuthOptions } from '../types.js';
import {
  getCommonOptions,
  toBase64URL,
  fromBase64Url,
} from '../utils.js';

export function fido(options: LiquidAuthOptions) {
  const { logger, getOrigin, getRPID, storage, events, origin, extensions } = getCommonOptions(options);
  const router = express.Router();

  if (!origin) {
    throw new Error('LiquidAuthOptions.origin is required');
  }

  if (!storage) {
    throw new Error('LiquidAuthOptions.storage is required');
  }

  // POST /attestation/request
  router.post('/attestation/request', async (req, res) => {
    const { username, extensions } = req.body;
    logger.info(`Attestation request for user: ${username}`);

    if (!extensions?.liquid) {
      logger.warn(`Attestation request for ${username} missing liquid extension`);
      return res.status(501).json({ error: 'Liquid extension is required' });
    }
    
    const rpID = getRPID(req);
    const registrationOptions = await generateRegistrationOptions({
      rpName: options.rpName || 'Liquid Auth',
      rpID,
      userName: username,
      userDisplayName: username,
      attestationType: 'none',
      authenticatorSelection: {
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    (req.session as any).attestationChallenge = registrationOptions.challenge;
    (req.session as any).liquidExtension = true;
    logger.info(`Generated attestation challenge: ${registrationOptions.challenge} for session: ${req.sessionID}`);
    await new Promise((resolve) => req.session.save(() => resolve(null)));

    registrationOptions.user.id = username;
    if (registrationOptions.extensions) {
        delete (registrationOptions.extensions as any).credProps;
    }
    
    res.json(registrationOptions);
  });

  // POST /attestation/response
  router.post('/attestation/response', async (req, res) => {
    const session = req.session as any;
    const body = req.body;
    const expectedChallenge = session.attestationChallenge;
    
    logger.info(`Verifying attestation response. Expected challenge: ${expectedChallenge} for session: ${req.sessionID}`);

    if (!expectedChallenge) {
      logger.error('Attestation failed: challenge not found in session');
      return res.status(401).json({ error: 'Challenge not found' });
    }

    const isLiquid = session.liquidExtension || false;
    if (isLiquid && !body.clientExtensionResults?.liquid) {
        logger.error('Attestation failed: liquid extension missing in response');
        return res.status(401).json({ error: 'Liquid extension not found' });
    }

    try {
      const rpID = getRPID(req);
      const originValue = getOrigin(req);
      
      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: originValue,
        expectedRPID: rpID,
      });

      if (!verification.verified) {
        logger.error('WebAuthn verification failed');
        throw new Error('Verification failed');
      }

      const { registrationInfo } = verification;
      
      if (isLiquid) {
          const liquid = body.clientExtensionResults.liquid;
          const type = liquid.type || 'ed25519';
          const adapter = extensions.find((e: any) => e.type === type);
          
          if (!adapter) {
              logger.error(`Liquid extension adapter not found for type: ${type}`);
              throw new Error(`Extension adapter for ${type} not found`);
          }

          const valid = await adapter.verify(expectedChallenge, liquid.signature, liquid.address, storage);
          if (!valid) {
              logger.error(`Liquid signature verification failed for address: ${liquid.address} using ${type} adapter`);
              throw new Error('Liquid signature verification failed');
          }
      }

      const username = body.clientExtensionResults?.liquid?.address || body.user?.name;
      logger.info(`Attestation successful for user: ${username}`);
      let user = await storage.findUserByWallet(username);
      if (!user) {
        user = await storage.createUser(username);
      }

      const credential = {
        device: body.clientExtensionResults?.liquid?.device || 'Unknown Device',
        publicKey: toBase64URL(registrationInfo!.credential.publicKey),
        credId: registrationInfo!.credential.id,
        prevCounter: registrationInfo!.credential.counter,
      };

      const existingCred = user.credentials.find(c => c.credId === credential.credId);
      if (!existingCred) {
        user.credentials.push(credential);
        await storage.updateUser(user);
      }

      delete session.attestationChallenge;
      delete session.liquidExtension;
      session.wallet = username;

      if (events) {
        events.emit('auth', {
          requestId: body.clientExtensionResults?.liquid?.requestId,
          wallet: user.wallet,
          credId: credential.credId,
          sessionId: req.sessionID,
        });
      }

      res.json(user);
    } catch (e: any) {
      res.status(401).json({ error: e.message || 'User verification failed' });
    }
  });

  // POST /assertion/request/:credId
  router.post('/assertion/request/:credId', async (req, res) => {
    const { credId } = req.params;
    logger.info(`Assertion request for credId: ${credId}`);
    const user = await storage.findUserByCredId(credId);
    if (!user) {
      logger.warn(`Assertion request failed: user not found for credId: ${credId}`);
      return res.status(401).json({ error: 'User not found' });
    }

    const rpID = getRPID(req);
    const authenticationOptions = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{
        id: credId,
      }],
      userVerification: 'required',
    });

    (req.session as any).assertionChallenge = authenticationOptions.challenge;
    logger.info(`Generated assertion challenge: ${authenticationOptions.challenge} for session: ${req.sessionID}`);
    await new Promise((resolve) => req.session.save(() => resolve(null)));
    res.json(authenticationOptions);
  });

  // POST /assertion/response
  router.post('/assertion/response', async (req, res) => {
    const session = req.session as any;
    const body = req.body;
    const expectedChallenge = session.assertionChallenge;
    
    logger.info(`Verifying assertion response for credId: ${body.id}. Expected challenge: ${expectedChallenge} for session: ${req.sessionID}`);

    if (!expectedChallenge) {
      logger.error('Assertion failed: challenge not found in session');
      return res.status(401).json({ error: 'Challenge not found' });
    }

    const user = await storage.findUserByCredId(body.id);
    if (!user) {
      logger.error(`Assertion failed: user not found for credId: ${body.id}`);
      return res.status(401).json({ error: 'Credential not found' });
    }

    try {
      const rpID = getRPID(req);
      const originValue = getOrigin(req);
      const credential = user.credentials.find(c => c.credId === body.id)!;

      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: originValue,
        expectedRPID: rpID,
        credential: {
          id: credential.credId,
          publicKey: new Uint8Array(fromBase64Url(credential.publicKey)),
          counter: credential.prevCounter,
        },
      });

      if (!verification.verified) {
        logger.error(`Assertion verification failed for user: ${user.wallet}`);
        throw new Error('Verification failed');
      }

      logger.info(`Assertion successful for user: ${user.wallet}`);
      credential.prevCounter = verification.authenticationInfo.newCounter;
      await storage.updateUser(user);

      delete session.assertionChallenge;
      session.wallet = user.wallet;

      if (events) {
        events.emit('auth', {
          requestId: body.clientExtensionResults?.liquid?.requestId,
          wallet: user.wallet,
          credId: body.id,
          sessionId: req.sessionID,
        });
      }

      res.json(user);
    } catch (e: any) {
      res.status(401).json({ error: e.message || 'User verification failed' });
    }
  });

  return router;
}
