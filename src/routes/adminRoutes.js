// server/src/routes/adminRoutes.js
import express from 'express';
import { protect, admin, superAdmin } from '../middleware/authMiddleware.js';
import {
  // Regular admin routes
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  getDepartments,
  getDashboardStats,
  getDisplaySettings,
  updateDisplaySettings,
  // Super admin routes
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAdminUsers,
  getSuperAdminStats,
  getAllColleges,
  updateSuperAdminProfile,
  uploadSuperAdminProfilePicture,
  getRankingWeights,
  updateRankingWeights,
  updateAdminProfile,
} from '../controllers/adminController.js';

const router = express.Router();

// Regular admin routes
router.get('/users', protect, admin, getAllUsers);
router.get('/users/:id', protect, admin, getUserById);
router.post('/users', protect, admin, createUser);
router.put('/users/:id', protect, admin, updateUser);
router.delete('/users/:id', protect, admin, deleteUser);
router.put('/users/:id/block', protect, admin, blockUser);
router.put('/users/:id/unblock', protect, admin, unblockUser);
router.get('/departments', protect, admin, getDepartments);
router.get('/stats', protect, admin, getDashboardStats);
router.get('/settings/display', protect, admin, getDisplaySettings);
router.put('/settings/display', protect, admin, updateDisplaySettings);
router.put('/profile', protect, admin, updateAdminProfile);

// Super admin routes
router.route('/')
  .get(protect, superAdmin, getAllAdmins)
  .post(protect, superAdmin, createAdmin);

router.route('/:id')
  .put(protect, superAdmin, updateAdmin)
  .delete(protect, superAdmin, deleteAdmin);

router.get('/:adminId/users', protect, superAdmin, getAdminUsers);
router.get('/dashboard/stats', protect, superAdmin, getSuperAdminStats);
router.get('/colleges', protect, superAdmin, getAllColleges);
router.put('/superadmin/profile', protect, superAdmin, updateSuperAdminProfile);
router.put('/superadmin/profile-picture', protect, superAdmin, uploadSuperAdminProfilePicture);
router.get('/ranking-weights', protect, superAdmin, getRankingWeights);
router.put('/ranking-weights', protect, superAdmin, updateRankingWeights);

export default router;