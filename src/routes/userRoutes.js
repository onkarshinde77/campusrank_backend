import express from 'express';
import {
  updateProfile,
  updateLeetCodeStats,
  getUserProfile,
  getContestInfo,
  uploadProfilePicture,
  getDisplaySettingsForUser,
  getBanner,
  saveLeetcodeHeatmapToUser,
  getUserLeetcodeHeatmap // Leaving these for now but they might be broken/deprecated
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { fetchGitHubHeatmap } from '../controllers/githubHeatmap.js';
import { getLeetCodeHeatmap } from '../controllers/leetcodeHeatmap.js';

const router = express.Router();

router.get('/profile/:id', protect, getUserProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile-picture', protect, uploadProfilePicture);
router.put('/update-stats', protect, updateLeetCodeStats);
router.get('/contest-info', protect, getContestInfo);
router.get('/display-settings', protect, getDisplaySettingsForUser);
router.get('/contributions/:username', getBanner);
router.post('/leetcode/heatmap', getLeetCodeHeatmap);
router.post('/github/heatmap', fetchGitHubHeatmap);
// router.post("/leetcode/heatmap-fetch", getLeetcodeHeatmap); // Removed redundant/broken route
// Protected heatmap routes
router.post('/save-heatmap', protect, saveLeetcodeHeatmapToUser);
router.get('/heatmap', protect, getUserLeetcodeHeatmap);


export default router;