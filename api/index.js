import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from '../server/src/config/db.js';
import authRoutes     from '../server/src/routes/auth.js';
import ticketRoutes   from '../server/src/routes/tickets.js';
import staffRoutes    from '../server/src/routes/staff.js';
import auditLogRoutes from '../server/src/routes/auditLogs.js';
import emailRoutes    from '../server/src/routes/email.js';

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

let isConnected = false;
app.use(async (_req, _res, next) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
    next();
  } catch (err) {
    console.error('DB connection error:', err);
    next(err);
  }
});

app.use('/api/auth',       authRoutes);
app.use('/api/tickets',    ticketRoutes);
app.use('/api/staff',      staffRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/email',      emailRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;
