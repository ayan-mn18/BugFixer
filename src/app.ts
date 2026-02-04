import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import chalk from 'chalk';
import config from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/common.middleware';

const app: Application = express();

// Colorful Morgan logging
const morganFormat = (tokens: any, req: any, res: any) => {
  const status = parseInt(tokens.status(req, res) || '0', 10);
  const method = tokens.method(req, res);
  const url = tokens.url(req, res);
  const responseTime = tokens['response-time'](req, res);
  const contentLength = tokens.res(req, res, 'content-length') || '-';

  // Color the status code
  let statusColor = chalk.green;
  if (status >= 500) statusColor = chalk.red;
  else if (status >= 400) statusColor = chalk.yellow;
  else if (status >= 300) statusColor = chalk.cyan;

  // Color the method
  const methodColors: Record<string, typeof chalk.green> = {
    GET: chalk.green,
    POST: chalk.blue,
    PUT: chalk.yellow,
    PATCH: chalk.magenta,
    DELETE: chalk.red,
  };
  const methodColor = methodColors[method] || chalk.white;

  return [
    chalk.gray('→'),
    methodColor.bold(method.padEnd(7)),
    statusColor.bold(status),
    chalk.white(url),
    chalk.gray('|'),
    chalk.cyan(`${responseTime}ms`),
    chalk.gray('|'),
    chalk.gray(`${contentLength}b`),
  ].join(' ');
};

// CORS configuration - Allow frontend origin with credentials
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Morgan logging
app.use(morgan(morganFormat as any));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
