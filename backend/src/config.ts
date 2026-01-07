import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

export const port = process.env.PORT ? Number(process.env.PORT) : 3000;
export const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
export const docsCollection = process.env.DOCS_COLLECTION || 'documents';
export const usersCollection = process.env.USERS_COLLECTION || 'users';
export const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
export const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
export const oauthRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google-callback';
export const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

export const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
