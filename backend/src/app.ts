import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './lib/env';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { settingsRouter } from './routes/settings';
import { referenceRouter } from './routes/reference';
import { applicationsRouter } from './routes/applications';
import { workflowRouter } from './routes/workflow';

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(env.publicUploadPath, express.static(path.resolve(process.cwd(), env.uploadDir)));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/reference', referenceRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api', workflowRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err?.status || 500).json({ error: err?.message || 'Unexpected server error.' });
});
