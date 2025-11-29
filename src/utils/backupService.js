// server/src/utils/backupService.js
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';
import StatisticsHistory from '../models/StatisticsHistory.js';

const execPromise = promisify(exec);

export const createDatabaseBackup = async () => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // Export all collections
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      collections: {
        users: await User.find({}),
        admins: await Admin.find({}),
        superadmins: await SuperAdmin.find({}),
        statistics_history: await StatisticsHistory.find({})
      }
    };

    // Write to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✓ Database backup created: ${backupFile}`);

    // Keep only last 7 backups
    cleanupOldBackups(backupDir, 7);

    return {
      success: true,
      file: backupFile,
      timestamp: new Date().toISOString(),
      collections: Object.keys(backup.collections).reduce((acc, key) => {
        acc[key] = backup.collections[key].length;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    throw error;
  }
};

export const restoreDatabaseBackup = async (backupFile) => {
  try {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    // Restore users
    if (backupData.collections.users && backupData.collections.users.length > 0) {
      await User.deleteMany({});
      await User.insertMany(backupData.collections.users);
      console.log(`✓ Restored ${backupData.collections.users.length} users`);
    }

    // Restore admins
    if (backupData.collections.admins && backupData.collections.admins.length > 0) {
      await Admin.deleteMany({});
      await Admin.insertMany(backupData.collections.admins);
      console.log(`✓ Restored ${backupData.collections.admins.length} admins`);
    }

    // Restore superadmins
    if (backupData.collections.superadmins && backupData.collections.superadmins.length > 0) {
      await SuperAdmin.deleteMany({});
      await SuperAdmin.insertMany(backupData.collections.superadmins);
      console.log(`✓ Restored ${backupData.collections.superadmins.length} superadmins`);
    }

    // Restore statistics history
    if (backupData.collections.statistics_history && backupData.collections.statistics_history.length > 0) {
      await StatisticsHistory.deleteMany({});
      await StatisticsHistory.insertMany(backupData.collections.statistics_history);
      console.log(`✓ Restored ${backupData.collections.statistics_history.length} statistics history records`);
    }

    return {
      success: true,
      restored: backupData.collections
    };
  } catch (error) {
    console.error('❌ Database restore failed:', error);
    throw error;
  }
};

export const listBackups = () => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: (stats.size / 1024).toFixed(2) + ' KB',
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.modified - a.modified);

    return backups;
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
};

export const cleanupOldBackups = (backupDir, keepCount = 7) => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`✓ Deleted old backup: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
};

export const getBackupStats = () => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null
      };
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'));

    let totalSize = 0;
    const stats = files.map(file => {
      const filePath = path.join(backupDir, file);
      const fileStats = fs.statSync(filePath);
      totalSize += fileStats.size;
      return fileStats;
    });

    const sorted = stats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

    return {
      totalBackups: files.length,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
      oldestBackup: sorted.length > 0 ? sorted[0].mtime : null,
      newestBackup: sorted.length > 0 ? sorted[sorted.length - 1].mtime : null
    };
  } catch (error) {
    console.error('Error getting backup stats:', error);
    return null;
  }
};

export default {
  createDatabaseBackup,
  restoreDatabaseBackup,
  listBackups,
  cleanupOldBackups,
  getBackupStats
};
