import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './src/config/database.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import { errorHandler } from './src/middleware/errorMiddleware.js';
import { updateAllUserStats } from './src/services/leetcodeService.js';
import cron from 'node-cron';
import emailRouter from './src/routes/emailRoutes.js';
import mongoose from 'mongoose';

// Database optimization imports
import { createDatabaseIndexes } from './src/utils/createIndexes.js';
import { setupMongooseLogging, setupConnectionMonitoring } from './src/utils/mongooseLogger.js';
import { createDatabaseBackup } from './src/utils/backupService.js';
import { runAllCleanupTasks } from './src/services/cleanupService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Setup database monitoring and logging
setupMongooseLogging(mongoose);
setupConnectionMonitoring(mongoose);

// Initialize database indexes on startup
mongoose.connection.once('open', async () => {
  try {
    await createDatabaseIndexes();
    console.log('✓ Database indexes initialized');
  } catch (error) {
    console.error('Failed to create indexes:', error);
  }
});

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/send',emailRouter);
// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

// Schedule automatic stats update every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running scheduled LeetCode stats update...');
  try {
    await updateAllUserStats();
    console.log('Scheduled update completed successfully');
  } catch (error) {
    console.error('Scheduled update failed:', error);
  }
});

// Schedule daily database backup at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled database backup...');
  try {
    const result = await createDatabaseBackup();
    console.log('✓ Database backup completed:', result);
  } catch (error) {
    console.error('❌ Database backup failed:', error);
  }
});

// Schedule daily cleanup at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('Running scheduled database cleanup...');
  try {
    const result = await runAllCleanupTasks({
      removeInactive: true,
      inactiveDays: 365,
      removeTokens: true,
      archiveStats: true,
      statsDays: 90
    });
    console.log('✓ Database cleanup completed:', result);
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('✓ Database optimization utilities loaded');
  console.log('✓ Scheduled tasks configured');
});