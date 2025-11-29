// routes/authRoutes.js
import express from 'express';
import { 
  register, 
  login, 
  getMe,
  googleAuthCallback,
  githubAuthCallback,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { 
  sendOTP, 
  verifyOTP 
} from '../controllers/otpController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
// Add these routes to authRoutes.js
router.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'select_account'
  });
  res.redirect(url);
});

router.get('/auth/google/callback', googleAuthCallback);

router.get('/auth/github', (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(url);
});

router.get('/auth/github/callback', githubAuthCallback);
// Protected routes
router.get('/me', protect, getMe);

export default router;