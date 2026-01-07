import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getUsersCollection } from '../db';

export async function getUserFromAuthHeader(req: express.Request): Promise<any | null> {
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

export function authRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
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

export function requireRole(...roles: string[]) {
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
