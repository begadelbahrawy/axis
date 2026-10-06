import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './lib/env';
import { issueCsrfCookie, requireCsrf } from './middleware/csrf';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { settingsRouter } from './routes/settings';
import { referenceRouter } from './routes/reference';
import { applicationsRouter } from './routes/applications';
import { workflowRouter } from './routes/workflow';

export const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    // The SPA is served from a different origin in dev (Vite on :5173); CSP is
    // enforced by the frontend's own static host in production instead.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(issueCsrfCookie);
app.use('/api', requireCsrf);
app.use(env.publicUploadPath, express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/reference', referenceRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api', workflowRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (env.nodeEnv !== 'test') console.error(err);
  const status = err?.status || 500;
  res.status(status).json({ error: status === 500 ? 'Unexpected server error.' : err?.message || 'Request failed.' });
});
