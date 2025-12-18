import User from '../models/User.js';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/email.js';

dotenv.config();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Google OAuth callback
export const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        profilePicture: picture,
        isEmailVerified: true
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Redirect with token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}&userId=${user._id}`);
  } catch (error) {
    console.error('Google auth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
  }
};

// GitHub OAuth callback
export const githubAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      { headers: { accept: 'application/json' } }
    );

    const { access_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${access_token}` }
    });

    const { login, email, avatar_url } = userResponse.data;

    // Find or create user
    let user = await User.findOne({ email: email || `${login}@github.com` });
    if (!user) {
      user = await User.create({
        name: login,
        email: email || `${login}@github.com`,
        profilePicture: avatar_url,
        isEmailVerified: true
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Redirect with token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}&userId=${user._id}`);
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=github_auth_failed`);
  }
};

// Register user or admin
export const register = async (req, res) => {
  try {
    const { role, ...userData } = req.body;
    
    if (role === 'admin') {
      // Check if admin already exists for this college
      const existingAdmin = await Admin.findOne({ collegeName: userData.collegeName });
      if (existingAdmin) {
        return res.status(400).json({ 
          success: false, 
          message: 'An admin already exists for this college' 
        });
      }

      // Create admin
      const admin = await Admin.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        collegeName: userData.collegeName,
        phoneNumber: userData.phoneNumber,
        yearsOfExperience: userData.yearsOfExperience,
        linkedinUsername: userData.linkedinUsername,
        credentialCode: userData.credentialCode,
        role: userData.role || 'admin'
      });

      // Generate token
      const token = generateToken(admin._id);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          collegeName: admin.collegeName,
          phoneNumber: admin.phoneNumber,
          yearsOfExperience: admin.yearsOfExperience,
          linkedinUsername: admin.linkedinUsername
        }
      });
    } else {
      // Handle user registration
      // Find admin for the selected college
      const collegeAdmin = await Admin.findOne({ collegeName: userData.collegeName });
      if (!collegeAdmin) {
        return res.status(400).json({ 
          success: false, 
          message: 'No admin found for this college. Please contact support.' 
        });
      }

      // If the admin has set a credential code, validate the student's college credential
      if (collegeAdmin.credentialCode) {
        if (!userData.collegeCredential || userData.collegeCredential !== collegeAdmin.credentialCode) {
          return res.status(400).json({
            success: false,
            message: 'Invalid college credential code for this college'
          });
        }
      }

      // Create user with collegeId reference
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        collegeName: userData.collegeName,
        department: userData.department,
        year: userData.year,
        collegeId: collegeAdmin._id, // Link to college admin
        leetcodeId: userData.leetcodeId,
        gfgId: userData.gfgId,
        linkedinUsername: userData.linkedinUsername,
        githubUsername: userData.githubUsername,
      });

      // Generate token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: 'user',
          collegeName: user.collegeName,
          department: user.department,
          year: user.year,
          leetcodeId: user.leetcodeId,
          gfgId: user.gfgId,
          githubUsername: user.githubUsername
        }
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Login user or admin
// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Forgot password request for:', email);

    const user = await User.findOne({ email });
    console.log('User found:', !!user);

    if (!user) {
      // For security, don't reveal if the email exists
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log('Reset URL:', resetUrl);

    // Send email
    const emailResponse = await fetch('http://localhost:5000/api/send/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        resetUrl: resetUrl
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResult.success) {
      throw new Error(emailResult.message || 'Failed to send email');
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing forgot password request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
// server/src/controllers/authController.js
export const resetPassword = async (req, res) => {
  try {
    console.log('Reset password request body:', req.body);
    console.log('Token:', req.params.token);
    
    // Get hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    console.log('Setting new password for user:', user.email);
    console.log('Password to set (type):', typeof req.body.password, req.body.password);

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Admin
    let admin = await Admin.findOne({ email }).select('+password');
    if (admin) {
      const isMatch = await admin.comparePassword(password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong password', errorType: 'wrong_password' });
      if (admin.isBlocked) {
        return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.', reason: admin.blockedReason });
      }
      const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          collegeName: admin.collegeName,
          phoneNumber: admin.phoneNumber,
          yearsOfExperience: admin.yearsOfExperience,
          linkedinUsername: admin.linkedinUsername,
          githubUsername: admin.githubUsername,
          profilePicture: admin.profilePicture
        }
      });
    }

    // 2) SuperAdmin (separate collection)
    let superadmin = await SuperAdmin.findOne({ email }).select('+password');
    if (superadmin) {
      const isMatch = await superadmin.comparePassword(password);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong password', errorType: 'wrong_password' });
      if (superadmin.isBlocked) {
        return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.', reason: superadmin.blockedReason });
      }
      const token = jwt.sign({ id: superadmin._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: superadmin._id,
          name: superadmin.name,
          email: superadmin.email,
          role: 'superadmin',
          phoneNumber: superadmin.phoneNumber,
          yearsOfExperience: superadmin.yearsOfExperience,
          linkedinUsername: superadmin.linkedinUsername,
          githubUsername: superadmin.githubUsername,
          profilePicture: superadmin.profilePicture
        }
      });
    }

    // 3) Regular user
    let user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Wrong username', errorType: 'wrong_username' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong password', errorType: 'wrong_password' });
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact admin.', reason: user.blockedReason });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: 'user',
        collegeName: user.collegeName,
        department: user.department,
        year: user.year,
        leetcodeId: user.leetcodeId,
        gfgId: user.gfgId,
        linkedinUsername: user.linkedinUsername,
        githubUsername: user.githubUsername
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
    
//     // Check if it's an admin
//     let admin = await Admin.findOne({ email }).select('+password');
//     if (admin) {
//       const isMatch = await admin.comparePassword(password);
//       if (!isMatch) {
//         return res.status(401).json({ success: false, message: 'Invalid credentials' });
//       }

//       if (admin.isBlocked) {
//         return res.status(403).json({ 
//           success: false, 
//           message: 'Your account has been blocked. Please contact support.',
//           reason: admin.blockedReason 
//         });
//       }

//       const token = generateToken(admin._id);

//       res.status(200).json({
//         success: true,
//         token,
//         user: {
//           id: admin._id,
//           name: admin.name,
//           email: admin.email,
//           role: admin.role,
//           collegeName: admin.collegeName,
//           phoneNumber: admin.phoneNumber,
//           yearsOfExperience: admin.yearsOfExperience,
//           linkedinUsername: admin.linkedinUsername
//         }
//       });
//     }
    
//     else {
//       // Check if it's a user
//       let user = await User.findOne({ email }).select('+password');
//       if (!user) {
//         return res.status(401).json({ success: false, message: 'Invalid credentials' });
//       }

//       const isMatch = await user.comparePassword(password);
//       if (!isMatch) {
//         return res.status(401).json({ success: false, message: 'Invalid credentials' });
//       }

//       if (user.isBlocked) {
//         return res.status(403).json({ 
//           success: false, 
//           message: 'Your account has been blocked. Please contact admin.',
//           reason: user.blockedReason 
//         });
//       }

//       const token = generateToken(user._id);

//       res.status(200).json({
//         success: true,
//         token,
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: 'user',
//           collegeName: user.collegeName,
//           department: user.department,
//           year: user.year,
//           leetcodeId: user.leetcodeId,
//           gfgId: user.gfgId,
//           githubUsername: user.githubUsername
//         }
//       });
//     }
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };
// Get current user/admin profile
export const getMe = async (req, res) => {
  try {
    // req.user is already set by the protect middleware
    const user = req.user;
    
    // Return user data based on role
    if (user.role === 'admin' || user.role === 'superadmin') {
      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeName: user.collegeName,
          phoneNumber: user.phoneNumber,
          yearsOfExperience: user.yearsOfExperience,
          linkedinUsername: user.linkedinUsername,
          profilePicture: user.profilePicture
        }
      });
    } else {
      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: 'user',
          collegeName: user.collegeName,
          department: user.department,
          year: user.year,
          leetcodeId: user.leetcodeId,
          gfgId: user.gfgId,
          githubUsername: user.githubUsername,
          profilePicture: user.profilePicture,
          leetcodeStats: user.leetcodeStats,
          gfgStats: user.gfgStats,
          githubStats: user.githubStats
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
  
};

