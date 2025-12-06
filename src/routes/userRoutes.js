import express from 'express';
import {
  updateProfile,
  updateLeetCodeStats,
  getUserProfile,
  getContestInfo,
  uploadProfilePicture,
  getDisplaySettingsForUser,
  getBanner
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile/:id', protect, getUserProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile-picture', protect, uploadProfilePicture);
router.put('/update-stats', protect, updateLeetCodeStats);
router.get('/contest-info', protect, getContestInfo);
router.get('/display-settings', protect, getDisplaySettingsForUser);
router.get('/contributions/:username', getBanner);

export default router;