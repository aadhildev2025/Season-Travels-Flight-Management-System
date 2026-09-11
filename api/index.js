import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB, isDBReady } from '../server/src/config/db.js';
import authRoutes          from '../server/src/routes/auth.js';
import ticketRoutes        from '../server/src/routes/tickets.js';
import staffRoutes         from '../server/src/routes/staff.js';
import auditLogRoutes      from '../server/src/routes/auditLogs.js';
import emailRoutes         from '../server/src/routes/email.js';
import credentialRoutes    from '../server/src/routes/credentials.js';
import spreadsheetRoutes   from '../server/src/routes/spreadsheets.js';
import staffCalendarRoutes from '../server/src/routes/staffCalendar.js';

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://seasontravels.com',
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
      origin.endsWith('seasontravels.com') ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

const apiRouter = express.Router();
apiRouter.use('/auth',           authRoutes);
apiRouter.use('/tickets',        ticketRoutes);
apiRouter.use('/staff',          staffRoutes);
apiRouter.use('/audit-logs',     auditLogRoutes);
apiRouter.use('/email',          emailRoutes);
apiRouter.use('/credentials',    credentialRoutes);
apiRouter.use('/spreadsheets',   spreadsheetRoutes);
apiRouter.use('/staff-calendar', staffCalendarRoutes);
apiRouter.get('/health', async (_req, res) => {
  const ready = await isDBReady();
  res.json({ status: ready ? 'ok' : 'degraded', timestamp: new Date().toISOString() });
});

app.use('/api', apiRouter);
app.use('/', apiRouter);

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('API Error:', err);
  }
  res.header('Access-Control-Allow-Origin', req.headers?.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

export default app;
