import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import brandRoutes from './routes/brand.routes.js';
import reviewRoutes from './routes/review.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { startScheduledPing } from './services/scheduledPing.js';

const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in server/.env.');
}

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Too many sign-in attempts. Please try again later.' } });
app.get('/api/health', (req, res) => res.json({ success: true, service: 'BrandGuard API', status: 'healthy', timestamp: new Date().toISOString() }));
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/workspace-lookup', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Too many workspace checks. Please wait a minute and try again.' } }));
app.use('/api/auth', authRoutes);
app.use('/api/brand', requireAuth, brandRoutes);
app.use('/api/reviews', requireAuth, reviewRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/workspace', requireAuth, workspaceRoutes);
app.use(notFound);
app.use(errorHandler);

await connectDatabase();
const server = app.listen(port, () => console.log(`BrandGuard API listening on http://localhost:${port}`));
const stopScheduledPing = startScheduledPing();
server.on('close', stopScheduledPing);
