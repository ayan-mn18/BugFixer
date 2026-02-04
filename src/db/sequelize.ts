import { Sequelize } from 'sequelize';
import config from '../config';

// Create Sequelize instance
const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  logging: config.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  ssl: { rejectUnauthorized: false },
});

export default sequelize;
