// server/src/models/StatisticsHistory.js
import mongoose from 'mongoose';

const statisticsHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  platform: {
    type: String,
    enum: ['leetcode', 'github', 'gfg'],
    required: true,
    index: true
  },
  
  // Stats snapshot at time of capture
  stats: {
    // LeetCode specific
    totalSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    ranking: { type: Number, default: 0 },
    contestRating: { type: Number, default: 0 },
    attendedContestsCount: { type: Number, default: 0 },
    reputation: { type: Number, default: 0 },
    
    // GitHub specific
    totalRepositories: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    totalStars: { type: Number, default: 0 },
    totalForks: { type: Number, default: 0 },
    totalPRs: { type: Number, default: 0 },
    openPRs: { type: Number, default: 0 },
    closedPRs: { type: Number, default: 0 },
    mergedPRs: { type: Number, default: 0 },
    contributions: { type: Number, default: 0 },
    
    // GFG specific
    codingScore: { type: Number, default: 0 },
    instituteRank: { type: String, default: '' },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 }
  },
  
  // Metadata
  fetchedAt: { type: Date, default: Date.now, index: true },
  isLatest: { type: Boolean, default: true, index: true },
  
  // Change tracking
  change: {
    // How much changed from previous snapshot
    absoluteChange: { type: Number, default: 0 },
    percentageChange: { type: Number, default: 0 },
    isImprovement: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  collection: 'statistics_history'
});

// Index for efficient querying
statisticsHistorySchema.index({ userId: 1, platform: 1, fetchedAt: -1 });
statisticsHistorySchema.index({ userId: 1, isLatest: 1 });
statisticsHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

const StatisticsHistory = mongoose.model('StatisticsHistory', statisticsHistorySchema);

export default StatisticsHistory;
