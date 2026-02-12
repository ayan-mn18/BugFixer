import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/common.middleware';
import { WidgetToken } from './db';
import logger from './lib/logger';

const app: Application = express();

// ─── Cached widget origins (refreshed every 60s, avoids DB query per request) ─
let cachedWidgetOrigins: Set<string> = new Set();
let widgetOriginsCacheTime = 0;
const WIDGET_CACHE_TTL = 60_000; // 60 seconds

async function getWidgetOrigins(): Promise<Set<string>> {
  const now = Date.now();
  if (now - widgetOriginsCacheTime < WIDGET_CACHE_TTL) {
    return cachedWidgetOrigins;
  }
  try {
    const widgets = await WidgetToken.findAll({
      where: { enabled: true },
      attributes: ['allowedOrigins'],
    });
    const origins = new Set<string>();
    for (const w of widgets) {
      for (const o of w.allowedOrigins) {
        origins.add(o);
      }
    }
    cachedWidgetOrigins = origins;
    widgetOriginsCacheTime = now;
  } catch {
    // If DB isn't ready, keep stale cache
  }
  return cachedWidgetOrigins;
}

// CORS configuration
app.use(
  cors({
    origin: async (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, etc.)
      if (!origin) return callback(null, true);

      // Always allow configured frontend origins (fast, no DB)
      if (config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check cached widget origins (single DB query, cached 60s)
      const widgetOrigins = await getWidgetOrigins();
      if (widgetOrigins.has(origin) || widgetOrigins.has('*')) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
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

// Request logging — Morgan-style in dev, structured JSON in production
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const len = res.get('content-length') || '-';

    // Compact Morgan-style message for dev, full structured data for prod
    const msg = `${req.method} ${req.originalUrl} ${status} ${duration}ms - ${len}`;
    const logData = config.nodeEnv === 'development'
      ? {}
      : {
          method: req.method,
          path: req.originalUrl,
          status,
          duration: `${duration}ms`,
          contentLength: len,
          userAgent: req.get('user-agent'),
          ip: req.ip,
        };

    if (status >= 500) {
      logger.error(logData, msg);
    } else if (status >= 400) {
      logger.warn(logData, msg);
    } else {
      logger.info(logData, msg);
    }
  });
  next();
});

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
