import app from './app';
import config from './config';
import { initializeDatabase } from './db';

const startServer = async () => {
  try {
    // Initialize database (create tables if not exist)
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Start the server
    app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🐛 BugFixer API Server                                 ║
║                                                          ║
║   ✨ Server running on port ${config.port}                     ║
║   🌍 Environment: ${config.nodeEnv.padEnd(30)}║
║   🔗 API URL: http://localhost:${config.port}/api               ║
║   🏥 Health: http://localhost:${config.port}/health             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();
