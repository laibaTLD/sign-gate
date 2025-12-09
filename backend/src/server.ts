import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { embedSignatureInPdf, generateBasePdf } from './pdfService';
import { sendAgreementEmail } from './emailService';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
const docsCollection = process.env.DOCS_COLLECTION || 'documents';
const usersCollection = process.env.USERS_COLLECTION || 'users';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const oauthRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google-callback';
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());


const dataDir = path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'documents.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');
}

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'signflow-server' });
});


// --- User helpers (Mongo only) ---

async function getUsersCollection() {
  if (!mongoUri || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB not connected for users');
  }
  return mongoose.connection.collection(usersCollection);
}

async function findUserByEmail(email: string): Promise<any | null> {
  const Users = await getUsersCollection();
  const doc = await Users.findOne({ email });
  if (!doc) return null;
  return {
    ...doc,
    id: String((doc as any)._id || (doc as any).id || ''),
  };
}

// --- Auth & RBAC helpers ---

async function getUserFromAuthHeader(req: express.Request): Promise<any | null> {
  const auth = req.header('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as any;
    const userId = decoded.sub || decoded.id;
    const email = decoded.email;

    const Users = await getUsersCollection();
    const or: any[] = [];
    if (userId) {
      try {
        or.push({ _id: new mongoose.Types.ObjectId(String(userId)) });
      } catch {
        // ignore invalid ObjectId
      }
      or.push({ id: String(userId) });
    }
    if (email) {
      or.push({ email: String(email) });
    }
    if (!or.length) return null;

    const doc = await Users.findOne({ $or: or });
    if (!doc || doc.active === false) return null;

    return {
      ...doc,
      id: String((doc as any)._id || (doc as any).id || ''),
    };
  } catch (err) {
    console.error('[auth] getUserFromAuthHeader failed', err);
    return null;
  }
}

function authRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  getUserFromAuthHeader(req)
    .then(user => {
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      (req as any).user = user;
      next();
    })
    .catch(err => {
      console.error('[authRequired] unexpected error', err);
      res.status(500).json({ message: 'Auth error' });
    });
}

function requireRole(...roles: string[]) {
  const allowed = roles.map(r => String(r).toLowerCase());
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const userRole = String(user.role || '').toLowerCase();
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  console.log('[auth/register] incoming payload', { email, role });
  if (!email || !password) {
    console.warn('[auth/register] missing email or password');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      console.warn('[auth/register] user already exists', { email });
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const Users = await getUsersCollection();
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

// --- Admin user management (Mongo only) ---

// List all users (admin only)
app.get('/api/users', authRequired, requireRole('admin'), async (_req, res) => {
  try {
    const Users = await getUsersCollection();
    const docs = await Users.find({}).sort({ createdAt: -1 }).toArray();
    const users = docs.map(doc => ({
      id: String((doc as any)._id || (doc as any).id || ''),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      active: doc.active !== false,
      signature: (doc as any).signature,
      createdAt: doc.createdAt,
    }));
    res.json({ users });
  } catch (err: any) {
    console.error('[users/list] error', err);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

// Toggle active status for a user (admin only)
app.patch('/api/users/:id/toggle', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const Users = await getUsersCollection();
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const doc = await Users.findOne({ $or: or });
    if (!doc) return res.status(404).json({ message: 'User not found' });
    const nextActive = doc.active === false ? true : false;
    await Users.updateOne({ $or: or }, { $set: { active: nextActive } } as any);
    res.json({ ok: true, active: nextActive });
  } catch (err: any) {
    console.error('[users/toggle] error', err);
    res.status(500).json({ message: 'Failed to toggle user' });
  }
});

// Delete a non-admin user (admin only)
app.delete('/api/users/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const Users = await getUsersCollection();
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const doc = await Users.findOne({ $or: or });
    if (!doc) return res.status(404).json({ message: 'User not found' });
    if (String(doc.role || '').toLowerCase() === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }
    await Users.deleteOne({ $or: or });
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[users/delete] error', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
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

app.get('/api/auth/me', authRequired, (req, res) => {
  const user = (req as any).user;
  const { password: _ignored, ...userSafe } = user;
  res.json({ user: userSafe });
});

app.post('/api/auth/google-verify', async (req, res) => {
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

// Classic OAuth login endpoint used by the frontend popup
app.get('/api/auth/google-login', (req, res) => {
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

// OAuth callback endpoint. This is set as the redirect URI in Google Console.
app.get('/api/auth/google-callback', async (req, res) => {
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

app.post('/api/users/profile', authRequired, async (req, res) => {
  const user = (req as any).user;
  const { signature, name } = req.body || {};

  try {
    const Users = await getUsersCollection();
    const filter: any = { email: user.email };
    const update: any = { };
    if (signature !== undefined) update.signature = signature;
    if (name !== undefined) update.name = name;

    if (Object.keys(update).length === 0) {
      return res.json({ user });
    }

    await Users.updateOne(filter, { $set: update } as any);
    const updated = await Users.findOne(filter);
    if (!updated) return res.status(404).json({ message: 'User not found after update' });

    const userSafe = {
      id: String((updated as any)._id || (updated as any).id || ''),
      email: updated.email,
      name: updated.name,
      role: updated.role,
      active: updated.active !== false,
      signature: (updated as any).signature,
    };
    res.json({ user: userSafe });
  } catch (err: any) {
    console.error('[users/profile] error', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// --- Documents (Mongo) ---
type Doc = {
  id: string;
  title: string;
  status: 'PENDING' | 'SIGNED';
  createdAt: number;
  signedAt?: number;
  signerIP?: string;
  signerGmail?: string;
  fileUrl?: string; // base64 pdf
  signedPdfUrl?: string; // base64 pdf
  agentId?: string;
  agentName?: string;
  metadata?: any; // client/project/agency info from frontend
  signToken?: string;
};

function uid(prefix = 'doc') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// (Legacy JSON document seed removed; MongoDB is now the single source of truth for documents.)

// List documents (optionally filter by status/agentId/clientId) - Mongo only
app.get('/api/documents', authRequired, async (req, res) => {
  try {
    const { status, agentId, clientId } = req.query as any;
    const currentUser = (req as any).user;
    const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';

    const Model = mongoose.connection.collection(docsCollection);
    const query: any = {};
    if (status) query.status = new RegExp(`^${String(status)}$`, 'i');

    // Admin can optionally filter by any agentId; non-admins are restricted to their own
    const effectiveAgentId = isAdmin ? agentId : currentUser?.id;
    if (effectiveAgentId) {
      query.$or = [
        { agentId: String(effectiveAgentId) },
        { 'metadata.agentId': String(effectiveAgentId) }
      ];
    }
    if (clientId) query['metadata.clientId'] = String(clientId);

    const mongoDocs = await Model.find(query).limit(1000).toArray();
    let mapped = mongoDocs.map(mapAnyToDoc);

    // Extra safety: enforce ownership filter again for non-admins
    if (!isAdmin) {
      const ownerId = String(currentUser?.id || '');
      mapped = mapped.filter(d => {
        const docAgentId = String(d.agentId || '');
        const metaAgentId = String(d.metadata?.agentId || '');
        return ownerId && (docAgentId === ownerId || metaAgentId === ownerId);
      });
    }

    res.json({ documents: mapped });
  } catch (e) {
    console.error('[documents] list failed', e);
    res.status(500).json({ message: 'Failed to list documents' });
  }
});

// Get by id (auth) - Mongo only
app.get('/api/documents/:id', authRequired, async (req, res) => {
  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Not found' });

    const doc = mapAnyToDoc(mongoDoc);
    const currentUser = (req as any).user;
    const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
    if (!isAdmin) {
      const ownerId = String(currentUser?.id || '');
      const docAgentId = String(doc.agentId || '');
      const metaAgentId = String(doc.metadata?.agentId || '');
      if (ownerId && docAgentId !== ownerId && metaAgentId !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    res.json({ document: doc });
  } catch (e) {
    console.error('[documents] get failed', e);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// Public get (by token) - Mongo only
app.get('/api/documents/:id/public', async (req, res) => {
  const { token } = req.query as any;
  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Not found' });

    const mapped = mapAnyToDoc(mongoDoc);
    if (!token || token !== mapped.signToken) return res.status(401).json({ message: 'Invalid token' });
    res.json({ document: mapped });
  } catch (e) {
    console.error('[documents] public get failed', e);
    res.status(500).json({ message: 'Failed to load document' });
  }
});

// Create document - Mongo only
app.post('/api/documents', authRequired, requireRole('admin', 'agent'), async (req, res) => {
  const body = req.body || {};
  const currentUser = (req as any).user;
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const id = uid('doc');
  const signToken = uid('sign');

  const doc: Doc = {
    id,
    title: body.title || 'Untitled',
    status: 'PENDING',
    createdAt: Date.now(),
    fileUrl: body.fileUrl,
    agentId: isAdmin ? (body.metadata?.agentId || String(currentUser?.id || '')) : String(currentUser?.id || ''),
    agentName: isAdmin ? (body.metadata?.agentName || currentUser?.name) : currentUser?.name,
    metadata: {
      ...(body.metadata || {}),
      agentId: isAdmin ? (body.metadata?.agentId || String(currentUser?.id || '')) : String(currentUser?.id || ''),
    },
    signToken,
  };

  try {
    const Model = mongoose.connection.collection(docsCollection);
    await Model.insertOne({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      createdAt: new Date(doc.createdAt),
      signedAt: doc.signedAt ? new Date(doc.signedAt) : undefined,
      signerIP: doc.signerIP,
      signerGmail: doc.signerGmail,
      fileUrl: doc.fileUrl,
      signedPdfUrl: doc.signedPdfUrl,
      agentId: doc.agentId,
      agentName: doc.agentName,
      metadata: doc.metadata,
      signToken: doc.signToken,
    } as any);

    // Send Email with secure link only (no PDF attachment)
    if (doc.metadata?.clientEmail) {
      const agentEmail = doc.metadata.agencyEmail || 'info@usbrandbooster.com';
      const link = `${frontendUrl.replace(/\/$/, '')}/#/sign/${encodeURIComponent(doc.id)}?token=${encodeURIComponent(doc.signToken || '')}`;
      await sendAgreementEmail(
        doc.metadata.clientEmail,
        agentEmail,
        doc.agentName || 'Agent',
        doc.metadata.clientName || 'Client',
        doc.title,
        link
      );
    }

    res.status(201).json({ document: doc });
  } catch (e) {
    console.error('[documents] create failed', e);
    res.status(500).json({ message: 'Failed to create document' });
  }
});

// Resend (regenerates token and sends email) - Mongo only
app.post('/api/documents/:id/resend', authRequired, requireRole('admin', 'agent'), async (req, res) => {
  const currentUser = (req as any).user;
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';

  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Not found' });

    const doc = mapAnyToDoc(mongoDoc);

    if (!isAdmin) {
      const ownerId = String(currentUser?.id || '');
      const docAgentId = String(doc.agentId || '');
      const metaAgentId = String(doc.metadata?.agentId || '');
      if (ownerId && docAgentId !== ownerId && metaAgentId !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const newToken = uid('sign');
    await Model.updateOne({ $or: or }, { $set: { signToken: newToken } } as any);
    doc.signToken = newToken;

    if (doc.metadata?.clientEmail) {
      const agentEmail = doc.metadata.agencyEmail || 'info@usbrandbooster.com';
      const link = `${frontendUrl.replace(/\/$/, '')}/#/sign/${encodeURIComponent(doc.id)}?token=${encodeURIComponent(doc.signToken || '')}`;
      await sendAgreementEmail(
        doc.metadata.clientEmail,
        agentEmail,
        doc.agentName || 'Agent',
        doc.metadata.clientName || 'Client',
        doc.title,
        link
      );
    }

    res.status(201).json({ document: doc });
  } catch (e) {
    console.error('[documents] resend failed', e);
    res.status(500).json({ message: 'Failed to resend document' });
  }
});

// Delete - Mongo only
app.delete('/api/documents/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const result = await Model.deleteOne({ $or: or });
    if (!result.deletedCount) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[documents] delete failed', e);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// Bulk import (merge) documents - Mongo only
app.post('/api/documents/import', authRequired, requireRole('admin'), async (req, res) => {
  const incoming: Partial<Doc>[] = Array.isArray(req.body) ? req.body : (req.body?.documents || []);
  if (!Array.isArray(incoming)) return res.status(400).json({ message: 'Invalid payload' });

  try {
    const Model = mongoose.connection.collection(docsCollection);
    let added = 0;

    for (const item of incoming) {
      if (!item) continue;
      const id = String(item.id || uid('doc'));
      const status = (String(item.status || 'PENDING').toUpperCase() === 'SIGNED' ? 'SIGNED' : 'PENDING') as Doc['status'];

      const doc: Doc = {
        id,
        title: String(item.title || 'Untitled'),
        status,
        createdAt: Number(item.createdAt || Date.now()),
        signedAt: item.signedAt ? Number(item.signedAt) : undefined,
        signerIP: item.signerIP as any,
        signerGmail: item.signerGmail as any,
        fileUrl: (item as any).fileUrl || (item as any).pdfUrl,
        signedPdfUrl: item.signedPdfUrl as any,
        agentId: (item as any).agentId,
        agentName: (item as any).agentName,
        metadata: (item as any).metadata || {
          clientName: (item as any).clientName,
          clientEmail: (item as any).clientEmail,
          projectName: (item as any).projectName,
          agencyName: (item as any).agencyName,
          agencyEmail: (item as any).agencyEmail,
        },
        signToken: (item as any).signToken || uid('sign'),
      };

      const or: any[] = [{ id: doc.id }];
      try { or.unshift({ _id: new mongoose.Types.ObjectId(doc.id) }); } catch { }

      const result = await Model.updateOne(
        { $or: or },
        {
          $set: {
            title: doc.title,
            status: doc.status,
            createdAt: new Date(doc.createdAt),
            signedAt: doc.signedAt ? new Date(doc.signedAt) : undefined,
            signerIP: doc.signerIP,
            signerGmail: doc.signerGmail,
            fileUrl: doc.fileUrl,
            signedPdfUrl: doc.signedPdfUrl,
            agentId: doc.agentId,
            agentName: doc.agentName,
            metadata: doc.metadata,
            signToken: doc.signToken,
          },
        } as any,
        { upsert: true } as any,
      );

      if (result.upsertedCount || result.matchedCount === 0) {
        added++;
      }
    }

    const total = await Model.countDocuments({});
    res.json({ ok: true, added, total });
  } catch (e) {
    console.error('[documents] import failed', e);
    res.status(500).json({ message: 'Failed to import documents' });
  }
});

// Sign - Mongo only
app.post('/api/documents/:id/sign', async (req, res) => {
  const { dataUrl, token, signerEmail } = req.body || {};

  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Not found' });

    let doc = mapAnyToDoc(mongoDoc);

    // Token validation (if token is provided and signToken exists)
    if (token && doc.signToken && token !== doc.signToken) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    let basePdf: string;
    let lastY: number | undefined;

    // If original PDF exists, use it; otherwise generate a base PDF
    if (doc.fileUrl && doc.fileUrl.startsWith('data:application/pdf')) {
      basePdf = doc.fileUrl;
    } else {
      // Generate base PDF from document metadata
      const result = await generateBasePdf(doc.metadata || doc);
      basePdf = result.pdf;
      lastY = result.lastY;
    }

    // Create signer info object
    const signerInfo = {
      email: signerEmail || doc.metadata?.clientEmail,
      signedAt: Date.now(),
      clientCompanyName: doc.metadata?.clientCompanyName || doc.metadata?.clientCompany,
      businessOwnerName: doc.metadata?.businessOwnerName || doc.metadata?.clientName
    };

    // Embed signature into PDF with signer information
    const signedPdfUrl = await embedSignatureInPdf(basePdf, dataUrl, signerInfo, lastY);

    // Update doc object
    doc.status = 'SIGNED';
    doc.signedPdfUrl = signedPdfUrl;
    doc.signedAt = signerInfo.signedAt;
    doc.signerGmail = signerInfo.email;

    // Persist to MongoDB
    await Model.updateOne(
      { $or: or },
      {
        $set: {
          status: doc.status,
          signedAt: new Date(doc.signedAt || Date.now()),
          signerGmail: doc.signerGmail,
          signedPdfUrl: doc.signedPdfUrl,
        }
      } as any
    );

    res.json({ document: doc });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ message: 'Failed to sign document' });
  }
});

// Map a generic Mongo document into Doc shape expected by frontend
function asMillis(v: any): number | undefined {
  if (!v) return undefined;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const n = Date.parse(String(v));
  return isNaN(n) ? undefined : n;
}

function mapAnyToDoc(x: any): Doc {
  const id = String(x._id || x.id);
  const statusRaw = String(x.status || 'PENDING');
  const status = statusRaw.toUpperCase() === 'SIGNED' ? 'SIGNED' : 'PENDING';
  return {
    id,
    title: String(x.title || x.name || x.documentTitle || 'Untitled'),
    status,
    createdAt: asMillis(x.createdAt) ?? asMillis(x.created_at) ?? Date.now(),
    signedAt: asMillis(x.signedAt),
    signerIP: x.signerIP,
    signerGmail: x.signerGmail,
    fileUrl: x.fileUrl || x.pdfUrl || x.base64 || x.file || undefined,
    signedPdfUrl: x.signedPdfUrl || undefined,
    agentId: String(x.agentId || x?.metadata?.agentId || ''),
    agentName: String(x.agentName || ''),
    metadata: x.metadata || {
      clientName: x.clientName,
      clientEmail: x.clientEmail,
      projectName: x.projectName,
      agencyName: x.agencyName,
      agencyEmail: x.agencyEmail,
    },
    signToken: x.signToken,
  };
}

async function ensureDefaultAdminUser() {
  try {
    if (!mongoUri || mongoose.connection.readyState !== 1) return;
    const Users = await getUsersCollection();
    const count = await Users.countDocuments({});
    if (count > 0) return;
    const email = 'admin@example.com';
    const password = 'Passw0rd!';
    const hashedPassword = await bcrypt.hash(password, 10);
    await Users.insertOne({
      email,
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
      active: true,
      createdAt: new Date(),
    } as any);
    console.log('[mongo users] seeded default admin', { email });
  } catch (err) {
    console.error('[mongo users] failed to seed default admin', err);
  }
}

async function ensureIndexes() {
  try {
    if (!mongoUri || mongoose.connection.readyState !== 1) return;

    const Users = mongoose.connection.collection(usersCollection);
    await Users.createIndex({ email: 1 }, { unique: true });

    const Docs = mongoose.connection.collection(docsCollection);
    await Docs.createIndex({ agentId: 1 });
    await Docs.createIndex({ 'metadata.agentId': 1 });
    await Docs.createIndex({ 'metadata.clientEmail': 1 });

    console.log('[mongo] indexes ensured');
  } catch (err) {
    console.error('[mongo] failed to ensure indexes', err);
  }
}

// Connect to Mongo if URI provided
if (mongoUri) {
  mongoose.connect(mongoUri).then(async () => {
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB', { db: mongoose.connection.name, collection: docsCollection });
    try {
      const Model = mongoose.connection.collection(docsCollection);
      const count = await Model.countDocuments({});
      // eslint-disable-next-line no-console
      console.log('Mongo documents count:', count);
    } catch { }
    await ensureDefaultAdminUser();
    await ensureIndexes();
  }).catch(err => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err?.message || err);
  });
}

// Debug endpoint to verify Mongo visibility
app.get('/api/debug/mongo', async (_req, res) => {
  if (!mongoUri) return res.json({ configured: false });
  try {
    const connected = mongoose.connection.readyState === 1;
    if (!connected) return res.json({ configured: true, connected: false });
    const Model = mongoose.connection.collection(docsCollection);
    const count = await Model.countDocuments({});
    const sample = await Model.find({}).limit(5).toArray();
    res.json({ configured: true, connected: true, count, sample: sample.map(s => ({ id: String(s._id || s.id), title: s.title || s.name })) });
  } catch (e: any) {
    res.status(500).json({ configured: true, error: e?.message || String(e) });
  }
});

// Debug endpoint to test email
app.post('/api/debug/test-email', async (req, res) => {
  const { recipient } = req.body;
  if (!recipient) return res.status(400).json({ message: 'Recipient required' });

  // Minimal valid PDF (blank page)
  const dummyPdf = 'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCj4+CmVuZG9iagoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAgCjAwMDAwMDAxNTcgMDAwMDAgbiAgCnRyYWlsZXIKPDwKICAvU2l6ZSA0CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIxMwolJUVPRgo=';

  try {
    await sendAgreementEmail(
      recipient,
      'test-agent@example.com',
      'Test Agent',
      'Test Client',
      'SMTP Test Document',
      dummyPdf
    );
    res.json({ message: 'Test email queued/sent' });
  } catch (err: any) {
    console.error('Test email failed:', err);
    res.status(500).json({ message: 'Failed to send test email', error: err.message });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
