import pino from 'pino';
import config from '../config';

/**
 * Application Logger
 * 
 * Uses Pino for structured JSON logging.
 * In production, logs are also sent to BetterStack (Logtail) for
 * centralized log management, search, and alerting.
 * 
 * In development, logs are pretty-printed to the console.
 */

let logtailWarned = false;

function createLogger() {
  const targets: pino.TransportTargetOptions[] = [];

  // Pretty console output for development (Morgan-style compact output)
  if (config.nodeEnv === 'development') {
    targets.push({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,env,service',
        messageFormat: '{msg}',
        hideObject: true,
      },
      level: 'debug',
    });
  } else {
    // Plain JSON to stdout in production (for PM2 log files)
    targets.push({
      target: 'pino/file',
      options: { destination: 1 }, // stdout
      level: 'info',
    });
  }

  // BetterStack Logtail — only in production if token is set
  if (config.nodeEnv === 'production' && config.betterStack.sourceToken) {
    targets.push({
      target: '@logtail/pino',
      options: { sourceToken: config.betterStack.sourceToken },
      level: 'info',
    });
  }

  const transport = pino.transport({ targets });

  // Suppress Logtail transport errors (e.g. invalid token) so they don't spam stderr
  transport.on('error', (err: Error) => {
    if (!logtailWarned) {
      logtailWarned = true;
      // Use process.stderr directly to avoid infinite recursion through the logger
      process.stderr.write(`[logger] BetterStack transport error: ${err.message}. Further errors suppressed.\n`);
    }
  });

  return pino(
    {
      level: config.nodeEnv === 'development' ? 'debug' : 'info',
      base: {
        env: config.nodeEnv,
        service: 'bugfixer-api',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    transport
  );
}

const logger = createLogger();

export default logger;
