import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { authRequired } from '../middleware/auth';
import { docsCollection, frontendUrl, googleClient, googleClientId, googleClientSecret, oauthRedirectUri } from '../config';
import { getUsersCollection, mongoose } from '../db';
import { mapAnyToDoc } from '../models/doc';

const router = express.Router();

router.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  console.log('[auth/register] incoming payload', { email, role });
  if (!email || !password) {
    console.warn('[auth/register] missing email or password');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const Users = await getUsersCollection();
    const existing = await Users.findOne({ email });
    if (existing) {
      console.warn('[auth/register] user already exists', { email });
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const safeRole = String(role || '').toLowerCase() === 'admin' ? 'admin' : 'agent';
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertResult = await Users.insertOne({
      email,
      name: name || email,
      password: hashedPassword,
      role: safeRole,
      active: true,
      createdAt: new Date(),
    } as any);

    const userSafe = {
      id: String(insertResult.insertedId),
      email,
      name: name || email,
      role: safeRole,
      active: true,
    };
    console.log('[auth/register] user created', { id: userSafe.id, email, role: safeRole });
    res.status(201).json({ user: userSafe });
  } catch (err: any) {
    console.error('[auth/register] error', err);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const Users = await getUsersCollection();
    const doc = await Users.findOne({ email } as any);
    if (!doc) return res.status(401).json({ message: 'Invalid credentials' });

    const passwordHash = (doc as any).password || '';
    const ok = await bcrypt.compare(password || '', passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const userSafe = {
      id: String((doc as any)._id || (doc as any).id || ''),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      active: doc.active !== false,
      signature: (doc as any).signature,
    };

    const token = (jwt as any).sign(
      {
        sub: userSafe.id,
        email: userSafe.email,
        role: userSafe.role,
      },
      process.env.JWT_SECRET || 'dev_secret',
      {
        expiresIn: process.env.JWT_EXPIRE || '30d',
      },
    );

    res.json({ token, user: userSafe });
  } catch (err: any) {
    console.error('[auth/login] error', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/api/auth/me', authRequired, (req, res) => {
  const user = (req as any).user;
  const { password: _ignored, ...userSafe } = user;
  res.json({ user: userSafe });
});

router.post('/api/auth/google-verify', async (req, res) => {
  try {
    if (!googleClient || !googleClientId) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    const { idToken, docId } = req.body || {};
    if (!idToken || !docId) {
      return res.status(400).json({ message: 'idToken and docId are required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    const email = (payload?.email || '').toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ message: 'Google token missing email' });
    }

    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: String(docId) }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(String(docId)) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const mapped = mapAnyToDoc(mongoDoc);
    const expected = String(mapped.metadata?.clientEmail || '').toLowerCase().trim();

    if (!expected || email !== expected) {
      return res.status(403).json({ message: expected
        ? `Access denied. This document is assigned to ${expected}.`
        : 'Access denied for this document.' });
    }

    return res.json({ ok: true, email });
  } catch (err: any) {
    console.error('[auth/google-verify] error', err);
    return res.status(500).json({ message: 'Google verification failed' });
  }
});

router.get('/api/auth/google-login', (req, res) => {
  try {
    if (!googleClientId || !googleClientSecret) {
      return res.status(500).json({ message: 'Google OAuth not configured' });
    }

    const { docId } = req.query as any;
    if (!docId) {
      return res.status(400).json({ message: 'docId is required' });
    }

    const state = Buffer.from(JSON.stringify({ docId })).toString('base64url');
    const oauthClient = new OAuth2Client(googleClientId, googleClientSecret, oauthRedirectUri);
    const url = oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      include_granted_scopes: true,
    });

    return res.redirect(url);
  } catch (err: any) {
    console.error('[auth/google-login] error', err);
    return res.status(500).json({ message: 'Failed to start Google login' });
  }
});

router.get('/api/auth/google-callback', async (req, res) => {
  try {
    if (!googleClientId || !googleClientSecret) {
      return res.status(500).send('Google OAuth not configured');
    }

    const { code, state } = req.query as any;
    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
    } catch {
      return res.status(400).send('Invalid state');
    }

    const { docId } = parsed;
    if (!docId) {
      return res.status(400).send('Missing docId in state');
    }

    const oauthClient = new OAuth2Client(googleClientId, googleClientSecret, oauthRedirectUri);
    const { tokens } = await oauthClient.getToken(String(code));
    const idToken = tokens.id_token;
    if (!idToken) {
      return res.status(400).send('Missing id_token from Google');
    }

    const ticket = await oauthClient.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    const email = (payload?.email || '').toLowerCase().trim();

    if (!email) {
      return res.status(400).send('Google token missing email');
    }

    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: String(docId) }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(String(docId)) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) {
      return res.status(404).send('Document not found');
    }

    const mapped = mapAnyToDoc(mongoDoc);
    const expected = String(mapped.metadata?.clientEmail || '').toLowerCase().trim();

    let ok = true;
    let message = '';
    if (!expected || email !== expected) {
      ok = false;
      message = expected
        ? `Access denied. This document is assigned to ${expected}.`
        : 'Access denied for this document.';
    }

    const targetOrigin = frontendUrl.replace(/\/$/, '');
    const safeEmail = ok ? email : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Google Login</title></head>
<body>
<script>
  (function() {
    try {
      var data = { type: 'google-oauth-result', ok: ${ok ? 'true' : 'false'}, email: ${JSON.stringify(safeEmail)}, message: ${JSON.stringify(message)} };
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(data, ${JSON.stringify(targetOrigin)});
      }
    } catch (e) {}
    window.close();
  })();
</script>
<p>You can close this window.</p>
</body></html>`;

    return res.send(html);
  } catch (err: any) {
    console.error('[auth/google-callback] error', err);
    return res.status(500).send('Google login failed');
  }
});

export default router;
