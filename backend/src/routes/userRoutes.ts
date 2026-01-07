import express from 'express';
import { authRequired, requireRole } from '../middleware/auth';
import { getUsersCollection } from '../db';

const router = express.Router();

// List all users (admin only)
router.get('/api/users', authRequired, requireRole('admin'), async (_req, res) => {
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
router.patch('/api/users/:id/toggle', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const Users = await getUsersCollection();
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new (require('mongoose') as any).Types.ObjectId(req.params.id) }); } catch { }
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
router.delete('/api/users/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const Users = await getUsersCollection();
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new (require('mongoose') as any).Types.ObjectId(req.params.id) }); } catch { }
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

router.post('/api/users/profile', authRequired, async (req, res) => {
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

export default router;
