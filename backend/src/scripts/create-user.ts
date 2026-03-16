import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { mongoUri, usersCollection } from '../config';

async function createUser() {
  const args = process.argv.slice(2);
  
  let email = '';
  let password = '';
  let name = '';
  let role = 'agent';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' || arg === '-e') {
      email = args[++i] || '';
    } else if (arg === '--password' || arg === '-p') {
      password = args[++i] || '';
    } else if (arg === '--name' || arg === '-n') {
      name = args[++i] || '';
    } else if (arg === '--role' || arg === '-r') {
      role = args[++i] || 'agent';
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  if (!email || !password) {
    console.error('Error: Email and password are required');
    showHelp();
    process.exit(1);
  }

  const safeRole = role.toLowerCase() === 'admin' ? 'admin' : 'agent';

  try {
    if (!mongoUri) {
      console.error('Error: MONGO_URI environment variable is not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const Users = mongoose.connection.collection(usersCollection);

    const existing = await Users.findOne({ email });
    if (existing) {
      console.error(`Error: User with email "${email}" already exists`);
      await mongoose.disconnect();
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await Users.insertOne({
      email,
      name: name || email,
      password: hashedPassword,
      role: safeRole,
      active: true,
      createdAt: new Date(),
    } as any);

    console.log('\nUser created successfully:');
    console.log(`  ID: ${result.insertedId}`);
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name || email}`);
    console.log(`  Role: ${safeRole}`);
    console.log(`  Active: true`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (err: any) {
    console.error('Error creating user:', err.message || err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Usage: pnpm create:user [options]

Options:
  -e, --email <email>       User email (required)
  -p, --password <pass>     User password (required)
  -n, --name <name>         User name (optional, defaults to email)
  -r, --role <role>         User role: admin or agent (optional, defaults to agent)
  -h, --help                Show this help message

Examples:
  pnpm create:user --email user@example.com --password secret123
  pnpm create:user -e admin@example.com -p adminPass -n "Admin User" -r admin
`);
}

createUser();
