import express from 'express';
import cors from 'cors';
import { port } from './config';
import { connectMongo } from './db';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import documentRoutes from './routes/documentRoutes';
import debugRoutes from './routes/debugRoutes';

// --- Environment & core setup ---

const app = express();

// --- Global middleware ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'signflow-server' });
});

// Routes
app.use(authRoutes);
app.use(userRoutes);
app.use(documentRoutes);
app.use(debugRoutes);

// Connect to Mongo
connectMongo();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
