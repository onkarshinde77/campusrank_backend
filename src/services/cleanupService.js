// server/src/services/cleanupService.js
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import StatisticsHistory from '../models/StatisticsHistory.js';

// Delete accounts inactive for specified days
export const deleteInactiveAccounts = async (inactiveDays = 365) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    const deletedUsers = await User.deleteMany({
      updatedAt: { $lt: cutoffDate }
    });

    const deletedAdmins = await Admin.deleteMany({
      updatedAt: { $lt: cutoffDate }
    });

    console.log(`✓ Deleted ${deletedUsers.deletedCount} inactive users`);
    console.log(`✓ Deleted ${deletedAdmins.deletedCount} inactive admins`);

    return {
      users: deletedUsers.deletedCount,
      admins: deletedAdmins.deletedCount
    };
  } catch (error) {
    console.error('Error deleting inactive accounts:', error);
    throw error;
  }
};

// Remove expired password reset tokens
export const removeExpiredResetTokens = async () => {
  try {
    const result = await User.updateMany(
      {
        resetPasswordToken: { $exists: true },
        resetPasswordExpire: { $exists: true, $lt: new Date() }
      },
      {
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpire: 1
        }
      }
    );

    console.log(`✓ Removed ${result.modifiedCount} expired reset tokens`);
    return result.modifiedCount;
  } catch (error) {
    console.error('Error removing expired reset tokens:', error);
    throw error;
  }
};

// Archive old statistics (compress or delete)
export const archiveOldStatistics = async (daysToKeep = 90, action = 'delete') => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    let result;

    if (action === 'delete') {
      result = await StatisticsHistory.deleteMany({
        fetchedAt: { $lt: cutoffDate }
      });
      console.log(`✓ Deleted ${result.deletedCount} old statistics records`);
    } else if (action === 'archive') {
      result = await StatisticsHistory.updateMany(
        { fetchedAt: { $lt: cutoffDate } },
        { archived: true }
      );
      console.log(`✓ Archived ${result.modifiedCount} old statistics records`);
    }

    return result;
  } catch (error) {
    console.error('Error archiving old statistics:', error);
    throw error;
  }
};

// Remove empty or null fields
export const removeEmptyFields = async () => {
  try {
    const result = await User.updateMany(
      {},
      {
        $unset: {
          'leetcodeId': '',
          'gfgId': '',
          'githubUsername': '',
          'linkedinUsername': '',
          'profilePicture': ''
        }
      }
    );

    console.log(`✓ Cleaned up empty fields from ${result.modifiedCount} users`);
    return result.modifiedCount;
  } catch (error) {
    console.error('Error removing empty fields:', error);
    throw error;
  }
};

// Database optimization and cleanup report
export const generateCleanupReport = async () => {
  try {
    const userCount = await User.countDocuments();
    const adminCount = await Admin.countDocuments();
    const statsCount = await StatisticsHistory.countDocuments();
    
    const inactiveUsers = await User.countDocuments({
      updatedAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    });

    const usersWithoutStats = await User.countDocuments({
      'leetcodeStats.totalSolved': 0,
      'githubStats.totalRepositories': 0,
      'gfgStats.totalSolved': 0
    });

    const expiredTokens = await User.countDocuments({
      resetPasswordExpire: { $lt: new Date() }
    });

    return {
      summary: {
        totalUsers: userCount,
        totalAdmins: adminCount,
        totalStatistics: statsCount
      },
      recommendations: {
        inactiveUsers,
        usersWithoutStats,
        expiredTokens
      },
      actions: {
        deleteInactiveUsers: inactiveUsers > 0,
        removeUsersWithoutStats: usersWithoutStats > 0,
        removeExpiredTokens: expiredTokens > 0,
        archiveOldStatistics: statsCount > 100000
      }
    };
  } catch (error) {
    console.error('Error generating cleanup report:', error);
    throw error;
  }
};

// Run all cleanup tasks
export const runAllCleanupTasks = async (options = {}) => {
  try {
    const {
      removeInactive = true,
      inactiveDays = 365,
      removeTokens = true,
      archiveStats = true,
      statsDays = 90
    } = options;

    const results = {
      timestamp: new Date().toISOString(),
      tasks: {}
    };

    if (removeInactive) {
      results.tasks.inactiveAccounts = await deleteInactiveAccounts(inactiveDays);
    }

    if (removeTokens) {
      results.tasks.expiredTokens = await removeExpiredResetTokens();
    }

    if (archiveStats) {
      results.tasks.statistics = await archiveOldStatistics(statsDays, 'delete');
    }

    console.log('✓ All cleanup tasks completed');
    return results;
  } catch (error) {
    console.error('Error running cleanup tasks:', error);
    throw error;
  }
};

export default {
  deleteInactiveAccounts,
  removeExpiredResetTokens,
  archiveOldStatistics,
  removeEmptyFields,
  generateCleanupReport,
  runAllCleanupTasks
};
