import { Sequelize } from 'sequelize';
import config from '../config';
import logger from '../lib/logger';

// Create Sequelize instance
const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  logging: config.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 2,           // Keep minimum connections alive
    acquire: 60000,   // 60 seconds to acquire connection
    idle: 30000,      // 30 seconds idle before release
    evict: 10000,     // Check for stale connections every 10 seconds
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
    // Keep connections alive with Azure
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  },
  retry: {
    max: 3,           // Retry failed queries up to 3 times
  },
});

export default sequelize;
