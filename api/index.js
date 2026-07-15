import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from '../server/src/config/db.js';
import authRoutes     from '../server/src/routes/auth.js';
import ticketRoutes   from '../server/src/routes/tickets.js';
import staffRoutes    from '../server/src/routes/staff.js';
import auditLogRoutes from '../server/src/routes/auditLogs.js';

const app = express();

// Allow all Vercel preview + production URLs plus local dev
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain for preview deployments
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB once (cached across warm serverless invocations)
let isConnected = false;
app.use(async (_req, _res, next) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  next();
});

app.use('/api/auth',       authRoutes);
app.use('/api/tickets',    ticketRoutes);
app.use('/api/staff',      staffRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler — always send CORS headers so preflight never fails
app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  res.header('Access-Control-Allow-Origin', _req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Export for Vercel Serverless
export default app;
