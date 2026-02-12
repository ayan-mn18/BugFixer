import sequelize from './sequelize';
import { User, Project, Bug, ProjectMember, AccessRequest, Invitation, WidgetToken, GitHubIntegration, GitHubRepo, AgentConfig } from './models';
import logger from '../lib/logger';

// Initialize database - sync models
export const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Sync all models (creates tables if they don't exist)
    // await sequelize.sync({ alter: false });
    logger.info('Database models synchronized');
  } catch (error) {
    logger.error({ err: error }, 'Database initialization failed');
    throw error;
  }
};

// Export sequelize instance and models
export { sequelize, User, Project, Bug, ProjectMember, AccessRequest, Invitation, WidgetToken, GitHubIntegration, GitHubRepo, AgentConfig };
export default sequelize;
