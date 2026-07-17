import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { connectDB } from './config/db.js';
import authRoutes     from './routes/auth.js';
import ticketRoutes   from './routes/tickets.js';
import staffRoutes    from './routes/staff.js';
import auditLogRoutes from './routes/auditLogs.js';

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
    // Allow any localhost/127.0.0.1 origin, Vercel domain, or manually configured client URL
    if (
      localOriginRegex.test(origin) ||
      origin.endsWith('.vercel.app') ||
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

// Connect to MongoDB on demand for serverless, or on startup for local dev
let isConnected = false;
app.use(async (_req, _res, next) => {
  try {
    if (!isConnected && process.env.MONGODB_URI) {
      await connectDB();
      isConnected = true;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Group all routes under a single API router
const apiRouter = express.Router();
apiRouter.use('/auth',       authRoutes);
apiRouter.use('/tickets',    ticketRoutes);
apiRouter.use('/staff',      staffRoutes);
apiRouter.use('/audit-logs', auditLogRoutes);
apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Mount the router under both /api (for local dev) and / (for Vercel serverless stripping)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global JSON Error Handler with CORS headers support
app.use((err, req, res, _next) => {
  console.error('API Error:', err);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// For local running
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  connectDB().then(() => {
    isConnected = true;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }).catch(err => {
    console.error('Failed to start server:', err);
  });
}

export default app;
