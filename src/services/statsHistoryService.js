// server/src/services/statsHistoryService.js
import StatisticsHistory from '../models/StatisticsHistory.js';
import User from '../models/User.js';

// Record statistics snapshot
export const recordStatisticsSnapshot = async (userId, platform, newStats) => {
  try {
    // Mark previous latest records as not latest
    await StatisticsHistory.updateMany(
      { userId, platform, isLatest: true },
      { isLatest: false }
    );

    // Get previous stats for change calculation
    const previousSnapshot = await StatisticsHistory.findOne(
      { userId, platform, isLatest: false },
      {},
      { sort: { fetchedAt: -1 } }
    );

    // Calculate change
    let change = { absoluteChange: 0, percentageChange: 0, isImprovement: true };
    
    if (previousSnapshot && platform === 'leetcode') {
      const oldSolved = previousSnapshot.stats.totalSolved || 0;
      const newSolved = newStats.totalSolved || 0;
      const absoluteChange = newSolved - oldSolved;
      const percentageChange = oldSolved > 0 ? (absoluteChange / oldSolved) * 100 : 0;
      
      change = {
        absoluteChange,
        percentageChange,
        isImprovement: absoluteChange >= 0
      };
    }

    // Create new snapshot
    const snapshot = new StatisticsHistory({
      userId,
      platform,
      stats: newStats,
      isLatest: true,
      change,
      fetchedAt: new Date()
    });

    await snapshot.save();
    console.log(`✓ Statistics snapshot recorded for user ${userId} on ${platform}`);
    
    return snapshot;
  } catch (error) {
    console.error('Error recording statistics snapshot:', error);
    throw error;
  }
};

// Get user statistics history
export const getUserStatisticsHistory = async (userId, platform, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await StatisticsHistory.find({
      userId,
      platform,
      fetchedAt: { $gte: startDate }
    }).sort({ fetchedAt: -1 });

    return history;
  } catch (error) {
    console.error('Error fetching statistics history:', error);
    throw error;
  }
};

// Get latest statistics
export const getLatestStatistics = async (userId, platform) => {
  try {
    const latest = await StatisticsHistory.findOne({
      userId,
      platform,
      isLatest: true
    });

    return latest;
  } catch (error) {
    console.error('Error fetching latest statistics:', error);
    throw error;
  }
};

// Calculate statistics trends
export const calculateStatisticsTrends = async (userId, platform, days = 30) => {
  try {
    const history = await getUserStatisticsHistory(userId, platform, days);

    if (history.length < 2) {
      return {
        trend: 'insufficient_data',
        message: 'Not enough data points to calculate trend'
      };
    }

    const firstSnapshot = history[history.length - 1];
    const latestSnapshot = history[0];

    let metric = 'totalSolved';
    let expectedImprovement = true;

    if (platform === 'leetcode') {
      metric = 'totalSolved';
      expectedImprovement = true;
    } else if (platform === 'github') {
      metric = 'totalRepositories';
      expectedImprovement = true;
    } else if (platform === 'gfg') {
      metric = 'totalSolved';
      expectedImprovement = true;
    }

    const startValue = firstSnapshot.stats[metric] || 0;
    const endValue = latestSnapshot.stats[metric] || 0;
    const change = endValue - startValue;
    const changePercentage = startValue > 0 ? (change / startValue) * 100 : 0;

    const trend = {
      platform,
      metric,
      startValue,
      endValue,
      change,
      changePercentage,
      days,
      isImproving: expectedImprovement ? change >= 0 : change <= 0,
      snapshotCount: history.length,
      startDate: firstSnapshot.fetchedAt,
      endDate: latestSnapshot.fetchedAt
    };

    return trend;
  } catch (error) {
    console.error('Error calculating trends:', error);
    throw error;
  }
};

// Get comparison between two dates
export const getStatisticsComparison = async (userId, platform, fromDate, toDate) => {
  try {
    const fromSnapshot = await StatisticsHistory.findOne({
      userId,
      platform,
      fetchedAt: { $gte: fromDate },
      $where: 'this.fetchedAt < new Date("' + toDate.toISOString() + '")'
    }).sort({ fetchedAt: 1 });

    const toSnapshot = await StatisticsHistory.findOne({
      userId,
      platform,
      fetchedAt: { $lte: toDate }
    }).sort({ fetchedAt: -1 });

    if (!fromSnapshot || !toSnapshot) {
      return null;
    }

    return {
      from: {
        date: fromSnapshot.fetchedAt,
        stats: fromSnapshot.stats
      },
      to: {
        date: toSnapshot.fetchedAt,
        stats: toSnapshot.stats
      }
    };
  } catch (error) {
    console.error('Error fetching statistics comparison:', error);
    throw error;
  }
};

// Cleanup old statistics (older than specified days)
export const cleanupOldStatistics = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await StatisticsHistory.deleteMany({
      fetchedAt: { $lt: cutoffDate }
    });

    console.log(`✓ Cleaned up ${result.deletedCount} old statistics records`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up old statistics:', error);
    throw error;
  }
};

export default {
  recordStatisticsSnapshot,
  getUserStatisticsHistory,
  getLatestStatistics,
  calculateStatisticsTrends,
  getStatisticsComparison,
  cleanupOldStatistics
};
