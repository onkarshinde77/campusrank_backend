import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { fetchLeetCodeStats, fetchContestInfo } from '../services/leetcodeService.js';
import { fetchGFGStats } from '../services/gfgcodeService.js';
import { fetchGitHubStats } from '../services/githubcodeService.js';
import { defaultDisplaySettings } from './adminController.js';
import buildHeatmapFromCalendar from '../utils/heatmap.js';
import fetchLeetCodeCalendars from '../controllers/leetcodeHeatmap.js';
import fetchLeetCodeHeatmap, { fetchLeetCodeAllYearsData } from '../controllers/leetcodeHeatmap.js';
import fetch from "node-fetch";



const cache = new Map();
const TTL = 300;


// @desc    Get user profile
// @route   GET /api/users/profile/:id
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.department = req.body.department || user.department;
    user.year = req.body.year || user.year;
    user.cgpa = req.body.cgpa !== undefined ? req.body.cgpa : user.cgpa;
    user.leetcodeId = req.body.leetcodeId || user.leetcodeId;
    user.gfgId = req.body.gfgId || user.gfgId;
    user.linkedinUsername = req.body.linkedinUsername || user.linkedinUsername;
    user.githubUsername = req.body.githubUsername || user.githubUsername;

    // Handle profile picture if provided
    if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }

    const updatedUser = await user.save();

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload profile picture
// @route   PUT /api/users/profile-picture
// @access  Private
export const uploadProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!req.body.profilePicture) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    user.profilePicture = req.body.profilePicture;
    const updatedUser = await user.save();

    // Return the updated user with the profile picture
    res.json({
      success: true,
      profilePicture: updatedUser.profilePicture
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update LeetCode, GFG, and GitHub stats
// @route   PUT /api/users/update-stats
// @access  Private
export const updateLeetCodeStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let leetcodeStats = null;
    let gfgStats = null;
    let githubStats = null;

    // Fetch LeetCode stats if ID exists
    if (user.leetcodeId) {
      leetcodeStats = await fetchLeetCodeStats(user.leetcodeId);
      if (leetcodeStats) {
        user.leetcodeStats = {
          ...leetcodeStats,
          lastUpdated: new Date()
        };
      }
    }

    // Fetch GFG stats if ID exists
    if (user.gfgId) {
      gfgStats = await fetchGFGStats(user.gfgId);
      if (gfgStats) {
        user.gfgStats = {
          ...gfgStats,
          lastUpdated: new Date()
        };
      }
    }

    // Fetch GitHub stats if username exists
    if (user.githubUsername) {
      githubStats = await fetchGitHubStats(user.githubUsername);
      if (githubStats) {
        user.githubStats = {
          ...githubStats,
          lastUpdated: new Date()
        };
      }
    }

    if (!leetcodeStats && !gfgStats && !githubStats) {
      return res.status(400).json({
        message: 'Failed to fetch stats. Please check your LeetCode ID, GFG ID, or GitHub username.'
      });
    }

    const updatedUser = await user.save();

    res.json({
      message: 'Stats updated successfully',
      leetcodeStats: updatedUser.leetcodeStats,
      gfgStats: updatedUser.gfgStats,
      githubStats: updatedUser.githubStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's contest information
// @route   GET /api/users/contest-info
// @access  Private
export const getContestInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch contest info from LeetCode
    const contestInfo = await fetchContestInfo(user.leetcodeId);

    if (!contestInfo) {
      return res.status(404).json({
        message: 'No contest data found. User may not have participated in contests.'
      });
    }

    res.json({
      success: true,
      contestInfo
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDisplaySettingsForUser = async (req, res) => {
  try {
    let admin;

    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      admin = await Admin.findById(req.user._id).select('displaySettings');
    } else {
      if (!req.user.collegeId) {
        return res.status(400).json({
          success: false,
          message: 'User is not associated with a college admin'
        });
      }

      admin = await Admin.findById(req.user.collegeId).select('displaySettings');
    }

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found for display settings'
      });
    }

    const stored = admin.displaySettings || {};
    const merged = {
      leaderboard: {
        ...defaultDisplaySettings.leaderboard,
        ...(stored.leaderboard || {})
      },
      dashboard: {
        ...defaultDisplaySettings.dashboard,
        ...(stored.dashboard || {})
      },
      ranking: {
        ...defaultDisplaySettings.ranking,
        ...(current.ranking || {}),
        ...(ranking || {})
      }
    };

    res.status(200).json({
      success: true,
      settings: merged
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getBanner = async (req, res) => {
  try {
    const username = req.params.username;

    const url = `https://ghchart.rshah.org/00ff00/${username}`;

    const r = await fetch(url);
    const svg = await r.text();

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);

  } catch (err) {
    console.error("Banner error:", err);
    res.status(500).send("Server error");
  }
};

export const leetcodeHeatmap = async (req, res) => {
  try {
    const { username, year } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const data = await fetchLeetCodeCalendars(username);

    // Use the provided year or the first active year or current year
    const targetYear = year || (data.activeYears && data.activeYears[0]) || new Date().getUTCFullYear();

    const { months, totalActiveDays, streak } = buildHeatmapFromCalendar(
      data.submissionCalendar,
      targetYear
    );

    res.json({
      years: data.activeYears || [targetYear],
      streak: streak,
      totalActiveDays: totalActiveDays,
      heatmap: { months }
    });
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch heatmap' });
  }
};


export async function getLeetcodeHeatmap(req, res) {
  try {
    const { username, year } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // 1️⃣ Check DB
    let cached = await LeetcodeHeatmap.findOne({ username });

    // 2️⃣ Fetch + save if not cached
    if (!cached) {
      const raw = await fetchLeetCodeHeatmap(username);

      cached = await LeetcodeHeatmap.create({
        username: raw.username,
        activeYears: raw.activeYears,
        totalActiveDays: raw.totalActiveDays,
        submissionCalendar: raw.submissionCalendar
      });
    }

    // 3️⃣ Only years (first call)
    if (!year) {
      return res.json({
        years: cached.activeYears
      });
    }

    // 4️⃣ Build heatmap for specific year
    const heatmap = buildHeatmapFromCalendar(
      cached.submissionCalendar,
      year
    );

    res.status(200).json({
      success: true,
      year: Number(year),
      activeYears: cached.activeYears,
      totalActiveDays: cached.totalActiveDays,
      totalSubmissions: cached.totalSubmissions || 0,
      heatmap
    });
  } catch (err) {
    console.error("Leetcode controller error:", err);
    res.status(500).json({ error: "Heatmap failed" });
  }
}

// @desc    Save LeetCode heatmap data to user profile
// @route   POST /api/users/save-heatmap
// @access  Private
export const saveLeetcodeHeatmapToUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { leetcodeUsername } = req.body;

    if (!leetcodeUsername) {
      return res.status(400).json({
        success: false,
        message: 'LeetCode username is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const heatmapData = await fetchLeetCodeAllYearsData(leetcodeUsername);

    console.log('=== SAVING HEATMAP ===');
    console.log('Fetched data:', {
      totalSubmissions: heatmapData.totalSubmissions,
      maxStreak: heatmapData.maxStreak,
      activeYears: heatmapData.activeYears,
      yearsCount: Object.keys(heatmapData.years || {}).length
    });

    // Initialize structure
    if (!user.leetcodeHeatmap) {
      user.leetcodeHeatmap = {
        activeYears: [],
        years: new Map(),
        totalActiveDays: 0,
        totalSubmissions: 0,
        maxStreak: 0
      };
    }

    // RESET map safely
    user.leetcodeHeatmap.years = new Map();

    // ✅ SAFE MAP INSERT
    for (const [yearKey, yearValue] of Object.entries(heatmapData.years || {})) {
      if (!yearValue || !yearValue.submissionCalendar) {
        console.warn(`⚠️ Skipping ${yearKey} due to missing data`);
        continue;
      }

      user.leetcodeHeatmap.years.set(yearKey, {
        submissionCalendar: String(yearValue.submissionCalendar),
        totalActiveDays: yearValue.totalActiveDays || 0,
        totalSubmissions: yearValue.totalSubmissions || 0,
        maxStreak: yearValue.maxStreak || 0
      });
    }

    user.leetcodeHeatmap.activeYears = heatmapData.activeYears || [];
    user.leetcodeHeatmap.totalActiveDays = heatmapData.totalActiveDays || 0;
    user.leetcodeHeatmap.totalSubmissions = heatmapData.totalSubmissions || 0;
    user.leetcodeHeatmap.maxStreak = heatmapData.maxStreak || 0;
    user.leetcodeHeatmap.lastUpdated = new Date();

    if (!user.leetcodeId) {
      user.leetcodeId = leetcodeUsername;
    }

    user.markModified('leetcodeHeatmap');
    await user.save();

    console.log('=== HEATMAP SAVED SUCCESSFULLY ===');

    return res.status(200).json({
      success: true,
      message: 'Heatmap data saved successfully'
    });

  } catch (error) {
    console.error('🔥 Error saving heatmap to user:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



export const getUserLeetcodeHeatmap = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { year } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const heatmap = user.leetcodeHeatmap;

    if (!heatmap || !heatmap.years || Object.keys(heatmap.years).length === 0) {
      return res.status(200).json({
        success: true,
        data: { matchedUser: {} },
        activeYears: [],
        totalActiveDays: 0,
        totalSubmissions: 0,
        maxStreak: 0,
        lastUpdated: null
      });
    }

    /* --------------------------------
     * BUILD ALL YEARS (UI NORMALIZED)
     * -------------------------------- */
    const matchedUser = {};
    let totalActiveDays = 0;
    let totalSubmissions = 0;

    for (const [yearKey, yearData] of Object.entries(heatmap.years)) {
      if (!yearData || !yearData.submissionCalendar) continue;

      const yearActiveDays = yearData.totalActiveDays || 0;
      const yearSubmissions = yearData.totalSubmissions || 0;

      matchedUser[yearKey] = {
        submissionCalendar:
          typeof yearData.submissionCalendar === 'string'
            ? yearData.submissionCalendar
            : JSON.stringify(yearData.submissionCalendar || {}),

        // ✅ UI EXPECTED NAMES
        activeDays: yearActiveDays,
        totalSubmissions: yearSubmissions,
        maxStreak: yearData.maxStreak || 0
      };

      totalActiveDays += yearActiveDays;
      totalSubmissions += yearSubmissions;
    }

    /* --------------------------------
     * NO YEAR → SUMMARY RESPONSE
     * -------------------------------- */
    if (!year) {
      return res.status(200).json({
        success: true,
        data: { matchedUser },
        activeYears: heatmap.activeYears || [],
        totalActiveDays,
        totalSubmissions,
        maxStreak: heatmap.maxStreak || 0,
        lastUpdated: heatmap.lastUpdated || null
      });
    }

    /* --------------------------------
     * SPECIFIC YEAR
     * -------------------------------- */
    const yearKey = `y${year}`;
    const yearData = heatmap.years?.[yearKey];

    if (!yearData || !yearData.submissionCalendar) {
      return res.status(404).json({
        success: false,
        message: `Heatmap data for year ${year} not found`
      });
    }

    let submissionCalendar = {};
    try {
      submissionCalendar =
        typeof yearData.submissionCalendar === 'string'
          ? JSON.parse(yearData.submissionCalendar)
          : yearData.submissionCalendar || {};
    } catch {
      submissionCalendar = {};
    }

    const heatmapData = buildHeatmapFromCalendar(
      submissionCalendar,
      parseInt(year)
    );

    return res.status(200).json({
      success: true,
      year: parseInt(year),
      activeYears: heatmap.activeYears || [],
      matchedUser,
      totalSubmissions: yearData.totalSubmissions || 0,
      heatmap: heatmapData
    });

  } catch (error) {
    console.error('Error fetching user heatmap:', error);
    return res.status(200).json({
      success: true,
      data: { matchedUser: {} },
      activeYears: [],
      totalActiveDays: 0,
      totalSubmissions: 0,
      maxStreak: 0,
      heatmap: null
    });
  }
};





