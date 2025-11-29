import express from 'express';
import { 
  getLeaderboard, 
  getLeaderboardByDepartment,
  getLeaderboardByYear 
} from '../controllers/leaderboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/leaderboardall', protect, getLeaderboard);
router.get('/department/:department', protect, getLeaderboardByDepartment);
router.get('/year/:year', protect, getLeaderboardByYear);

export default router;