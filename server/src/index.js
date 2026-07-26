import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { connectDB, isDBReady } from './config/db.js';
import authRoutes     from './routes/auth.js';
import ticketRoutes   from './routes/tickets.js';
import staffRoutes    from './routes/staff.js';
import auditLogRoutes from './routes/auditLogs.js';
import emailRoutes    from './routes/email.js';

const app  = express();
app.use(compression());
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
].filter(Boolean);

const localOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      localOriginRegex.test(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.one.com') ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Connect to MariaDB on demand for serverless, or on startup for local dev
let isConnected = false;
app.use(async (_req, _res, next) => {
  if (!isConnected && process.env.DATABASE_URL) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Database connection attempt failed in middleware:', err.message);
    }
  }
  next();
});

// Group all routes under a single API router
const apiRouter = express.Router();
apiRouter.use('/auth',       authRoutes);
apiRouter.use('/tickets',    ticketRoutes);
apiRouter.use('/staff',      staffRoutes);
apiRouter.use('/audit-logs', auditLogRoutes);
apiRouter.use('/email',      emailRoutes);
apiRouter.get('/health', async (_req, res) => {
  const ready = await isDBReady();
  res.json({ status: ready ? 'ok' : 'degraded', timestamp: new Date().toISOString(), db: ready ? 'connected' : 'disconnected' });
});

// Mount the router under both /api (for local dev) and / (for Vercel serverless stripping)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global JSON Error Handler with CORS headers support
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('API Error:', err);
  }
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// For local running
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const tryConnect = async (attempt = 1) => {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error(`DB connection retry ${attempt} failed:`, err.message);
      setTimeout(() => tryConnect(attempt + 1), 5000);
    }
  };

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    tryConnect();
  });
}

export default app;
