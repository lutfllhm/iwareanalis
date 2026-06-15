import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import apiRouter from './routes';
import logger from './services/logger';
import { startSyncScheduler } from './services/syncScheduler';

const app = express();

// 1. Security Headers (Helmet.js)
app.use(helmet());

// 2. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: ['https://iwanalys.iwareid.com', 'http://iwanalys.iwareid.com', 'http://localhost:3010', 'http://127.0.0.1:3010', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  })
);

// 3. Request Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. API Endpoints
app.use('/api', apiRouter);

// Root health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date(),
    environment: config.nodeEnv,
    mockMode: config.accurate.mock
  });
});

// 5. Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Unhandled error on ${req.method} ${req.url}:`, err);
  
  const status = err.status || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server';
  
  res.status(status).json({
    message,
    error: config.nodeEnv === 'development' ? err.stack : undefined
  });
});

// 6. Start listening
app.listen(config.port, async () => {
  logger.info(`Server started successfully on port ${config.port} in ${config.nodeEnv} mode`);
  
  // Start the background cron sync job scheduler
  await startSyncScheduler();
});

export default app;
