import sequelize from './sequelize';
import { User, Project, Bug, ProjectMember, AccessRequest } from './models';

// Initialize database - sync models
export const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync all models (creates tables if they don't exist)
    // await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Export sequelize instance and models
export { sequelize, User, Project, Bug, ProjectMember, AccessRequest };
export default sequelize;
