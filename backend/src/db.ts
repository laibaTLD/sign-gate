import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { docsCollection, mongoUri, usersCollection } from './config';

export async function getUsersCollection() {
  if (!mongoUri || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB not connected for users');
  }
  return mongoose.connection.collection(usersCollection);
}

export async function findUserByEmail(email: string): Promise<any | null> {
  const Users = await getUsersCollection();
  const doc = await Users.findOne({ email });
  if (!doc) return null;
  return {
    ...doc,
    id: String((doc as any)._id || (doc as any).id || ''),
  };
}

export async function ensureDefaultAdminUser() {
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

export async function ensureIndexes() {
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

export function connectMongo() {
  if (!mongoUri) return;

  mongoose
    .connect(mongoUri)
    .then(async () => {
      console.log('Connected to MongoDB', { db: mongoose.connection.name, collection: docsCollection });
      try {
        const Model = mongoose.connection.collection(docsCollection);
        const count = await Model.countDocuments({});
        console.log('Mongo documents count:', count);
      } catch {
        // ignore
      }
      await ensureDefaultAdminUser();
      await ensureIndexes();
    })
    .catch(err => {
      console.error('MongoDB connection error:', err?.message || err);
    });
}

export { mongoose };
