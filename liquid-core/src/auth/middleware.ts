import * as express from 'express';
import { LiquidAuthOptions } from '../types.js';
import { getCommonOptions } from '../utils.js';

export function auth(options: LiquidAuthOptions) {
  const { storage } = getCommonOptions(options);
  const router = express.Router();

  if (!storage) {
    throw new Error('LiquidAuthOptions.storage is required');
  }

  // GET /user
  router.get('/user', async (req, res) => {
    const session = req.session as any;
    if (!session?.wallet) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await storage.findUserByWallet(session.wallet);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });

  // DELETE /keys/:id
  router.delete('/keys/:id', async (req, res) => {
    const session = req.session as any;
    if (!session?.wallet) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await storage.findUserByWallet(session.wallet);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.credentials = user.credentials.filter((c) => c.credId !== req.params.id);
    await storage.updateUser(user);
    res.json({ success: true });
  });

  // GET /logout
  router.get('/logout', (req, res) => {
    const session = req.session as any;
    delete session.wallet;
    delete session.active;
    delete session.requestId;
    res.redirect(302, '/');
  });

  // GET /session
  router.get('/session', async (req, res) => {
    const session = req.session as any;
    const user = session?.wallet ? await storage.findUserByWallet(session.wallet) : null;
    res.json({
      user: user
        ? {
            id: user.id,
            wallet: user.wallet,
            credentials: user.credentials,
          }
        : null,
      session,
    });
  });

  return router;
}
