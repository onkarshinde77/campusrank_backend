import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { fetchLeetCodeStats, fetchContestInfo } from '../services/leetcodeService.js';
import { fetchGFGStats } from '../services/gfgcodeService.js';
import { fetchGitHubStats } from '../services/githubcodeService.js';
import { defaultDisplaySettings } from './adminController.js';
import buildHeatmapFromCalendar from '../utils/heatmap.js';
import fetchLeetCodeCalendars from '../controllers/leetcodeHeatmap.js';
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

    const heatmap = buildHeatmapFromCalendar(
      data.submissionCalendar,
      targetYear
    );

    res.json({
      years: data.activeYears || [targetYear],
      streak: data.streak,
      totalActiveDays: data.totalActiveDays,
      heatmap
    });
  } catch (err) {
    console.error('Heatmap error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch heatmap' });
  }
};


