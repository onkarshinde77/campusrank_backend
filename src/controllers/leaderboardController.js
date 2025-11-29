// FILE: server/src/controllers/leaderboardController.js

import User from '../models/User.js';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';
import { defaultDisplaySettings } from './adminController.js';

// Helper to normalize 0..1 where higher is better
const makeNormalizer = (vals) => {
  if (!vals.length) return () => 0;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max === min) return () => 0;
  return (v) => (v - min) / (max - min);
};

// Helper to normalize 0..1 where LOWER is better (e.g. LeetCode global rank)
const makeLowerBetter = (vals) => {
  if (!vals.length) return () => 0;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max === min) return () => 0;
  return (v) => (max - v) / (max - min);
};

const buildLeaderboard = async (users, reqUser) => {
  if (!users.length) return [];

  // Figure out which admin's settings to use
  let adminId = null;
  if (reqUser.role === 'admin' || reqUser.role === 'superadmin') {
    adminId = reqUser._id;
  } else if (reqUser.role === 'user') {
    adminId = reqUser.collegeId;
  }

  let ranking = defaultDisplaySettings.ranking;
  if (adminId) {
    const admin = await Admin.findById(adminId).select('displaySettings');
    if (admin) {
      ranking = {
        ...defaultDisplaySettings.ranking,
        ...(admin.displaySettings?.ranking || {}),
      };
    }
  }

  // Get SuperAdmin ranking weights
  let weights = {
    leetcodeGlobalRank: 1,
    leetcodeContestRating: 1,
    leetcodeTotalSolved: 1,
    githubTotalRepositories: 1,
    githubTotalPRs: 1,
    githubMergedPRs: 1,
    gfgTotalSolved: 1,
    gfgContestRating: 1
  };

  const superadmin = await SuperAdmin.findOne().select('rankingWeights');
  if (superadmin && superadmin.rankingWeights) {
    weights = {
      ...weights,
      ...superadmin.rankingWeights
    };
  }

  // Collect arrays (ignore 0/undefined)
  const lcRanks      = users.map(u => u.leetcodeStats?.ranking).filter(v => typeof v === 'number' && v > 0);
  const lcContest    = users.map(u => u.leetcodeStats?.contestRating).filter(v => typeof v === 'number' && v > 0);
  const lcSolved     = users.map(u => u.leetcodeStats?.totalSolved).filter(v => typeof v === 'number' && v > 0);
  const ghRepos      = users.map(u => u.githubStats?.totalRepositories).filter(v => typeof v === 'number' && v > 0);
  const ghTotalPRs   = users.map(u => u.githubStats?.totalPRs).filter(v => typeof v === 'number' && v > 0);
  const ghMergedPRs  = users.map(u => u.githubStats?.mergedPRs).filter(v => typeof v === 'number' && v > 0);
  const gfgSolved    = users.map(u => u.gfgStats?.totalSolved).filter(v => typeof v === 'number' && v > 0);
  const gfgContest   = users.map(u => u.gfgStats?.contestRating).filter(v => typeof v === 'number' && v > 0);

  const nLcRank      = makeLowerBetter(lcRanks);
  const nLcContest   = makeNormalizer(lcContest);
  const nLcSolved    = makeNormalizer(lcSolved);
  const nGhRepos     = makeNormalizer(ghRepos);
  const nGhTotalPRs  = makeNormalizer(ghTotalPRs);
  const nGhMergedPRs = makeNormalizer(ghMergedPRs);
  const nGfgSolved   = makeNormalizer(gfgSolved);
  const nGfgContest  = makeNormalizer(gfgContest);

  const anyEnabled = Object.values(ranking || {}).some(Boolean);

  let scored = users.map((u) => {
    let score = 0;

    if (ranking?.includeLeetCodeGlobalRank) {
      const raw = u.leetcodeStats?.ranking;
      const v = raw && raw > 0 ? nLcRank(raw) : 0;
      score += v * weights.leetcodeGlobalRank;
    }

    if (ranking?.includeLeetCodeContestRating) {
      const v = u.leetcodeStats?.contestRating || 0;
      score += nLcContest(v) * weights.leetcodeContestRating;
    }

    if (ranking?.includeLeetCodeTotalSolved) {
      const v = u.leetcodeStats?.totalSolved || 0;
      score += nLcSolved(v) * weights.leetcodeTotalSolved;
    }

    if (ranking?.includeGithubTotalRepositories) {
      const v = u.githubStats?.totalRepositories || 0;
      score += nGhRepos(v) * weights.githubTotalRepositories;
    }

    if (ranking?.includeGithubTotalPRs) {
      const v = u.githubStats?.totalPRs || 0;
      score += nGhTotalPRs(v) * weights.githubTotalPRs;
    }

    if (ranking?.includeGithubMergedPRs) {
      const v = u.githubStats?.mergedPRs || 0;
      score += nGhMergedPRs(v) * weights.githubMergedPRs;
    }

    if (ranking?.includeGfgTotalSolved) {
      const v = u.gfgStats?.totalSolved || 0;
      score += nGfgSolved(v) * weights.gfgTotalSolved;
    }

    if (ranking?.includeGfgContestRating) {
      const v = u.gfgStats?.contestRating || 0;
      score += nGfgContest(v) * weights.gfgContestRating;
    }

    return { user: u, score };
  });

  // If nothing enabled or all scores are zero, fallback to LeetCode rank ascending
  const allZero = scored.every((s) => s.score === 0);
  if (!anyEnabled || allZero) {
    scored = users
      .map((u) => ({ user: u, score: 0 }))
      .sort((a, b) => {
        const ar = a.user.leetcodeStats?.ranking || Number.MAX_SAFE_INTEGER;
        const br = b.user.leetcodeStats?.ranking || Number.MAX_SAFE_INTEGER;
        return ar - br; // lower global rank is better
      });
  } else {
    // Higher composite score is better
    scored.sort((a, b) => b.score - a.score);
  }

  // Attach rank
  const leaderboard = scored.map((s, index) => ({
    ...s.user.toObject(),
    rank: index + 1,
  }));

  return leaderboard;
};

export const getLeaderboard = async (req, res) => {
  try {
    const collegeFilter = {};
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      collegeFilter.collegeId = req.user._id;
    } else if (req.user.role === 'user') {
      collegeFilter.collegeId = req.user.collegeId;
    }

    const users = await User.find({
      ...collegeFilter,
      isActive: true,
      role: { $nin: ['admin', 'superadmin'] },
    }).select('-password');

    const leaderboard = await buildLeaderboard(users, req.user);

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLeaderboardByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    const collegeFilter = {};
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      collegeFilter.collegeId = req.user._id;
    } else if (req.user.role === 'user') {
      collegeFilter.collegeId = req.user.collegeId;
    }

    const users = await User.find({
      ...collegeFilter,
      department: new RegExp(department, 'i'),
      isActive: true,
      role: { $nin: ['admin', 'superadmin'] },
    }).select('-password');

    const leaderboard = await buildLeaderboard(users, req.user);

    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLeaderboardByYear = async (req, res) => {
  try {
    const { year } = req.params;

    const collegeFilter = {};
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      collegeFilter.collegeId = req.user._id;
    } else if (req.user.role === 'user') {
      collegeFilter.collegeId = req.user.collegeId;
    }

    const users = await User.find({
      ...collegeFilter,
      year: parseInt(year, 10),
      isActive: true,
      role: { $nin: ['admin', 'superadmin'] },
    }).select('-password');

    const leaderboard = await buildLeaderboard(users, req.user);

    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};