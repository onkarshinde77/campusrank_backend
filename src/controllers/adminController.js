import User from '../models/User.js';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';
import bcrypt from 'bcryptjs';


export const defaultDisplaySettings = {
  leaderboard: {
    showDepartment: true,
    showLeetCodeSolved: true,
    showGfgSolved: true,
    showGithubCommits: true,
    showGithubPrs: true
  },
  dashboard: {
    showLeetCodeSection: true,
    showGfgSection: true,
    showGithubSection: true,
    showTopPerformers: true
  },
  ranking: {
    includeLeetCodeGlobalRank: true,
    includeLeetCodeContestRating: true,
    includeLeetCodeTotalSolved: true,
    includeGithubTotalRepositories: true,
    includeGithubTotalPRs: true,
    includeGithubMergedPRs: true,
    includeGfgTotalSolved: true,
    includeGfgContestRating: true
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ 
      collegeId: req.user._id, // Only users belonging to this admin's college
      isActive: true 
    })
    .select('-password')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ 
      _id: req.params.id,
      collegeId: req.user._id // Only users belonging to this admin's college
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found or access denied' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    const { name, email, password, department, year, leetcodeId, gfgId, linkedinUsername, githubUsername, role } = req.body;

    const userExists = await User.findOne({ $or: [{ email }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or roll number already exists' });
    }

    const user = await User.create({
      name, email, password, department, year,
      leetcodeId, gfgId, linkedinUsername, githubUsername,
      role: req.body.role || 'user'
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { _id: user._id, name: user.name, email: user.email, department: user.department, year: user.year, isAdmin: user.isAdmin }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.department = req.body.department || user.department;
    user.year = req.body.year || user.year;
    user.leetcodeId = req.body.leetcodeId !== undefined ? req.body.leetcodeId : user.leetcodeId;
    user.gfgId = req.body.gfgId !== undefined ? req.body.gfgId : user.gfgId;
    user.linkedinUsername = req.body.linkedinUsername !== undefined ? req.body.linkedinUsername : user.linkedinUsername;
    user.githubUsername = req.body.githubUsername !== undefined ? req.body.githubUsername : user.githubUsername;
    user.role = req.body.role || user.role;
    user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block user
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
export const blockUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }

    user.isBlocked = true;
    user.blockedReason = reason || 'No reason provided';
    await user.save();

    res.json({ success: true, message: 'User blocked successfully', data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unblock user
// @route   PUT /api/admin/users/:id/unblock
// @access  Private/Admin
export const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = false;
    user.blockedReason = '';
    await user.save();

    res.json({ success: true, message: 'User unblocked successfully', data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all departments
// @route   GET /api/admin/departments
// @access  Private/Admin
export const getDepartments = async (req, res) => {
  try {
    const departments = await User.distinct('department');
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ 
      collegeId: req.user._id,
      isActive: true 
    });

    const activeUsers = await User.countDocuments({ 
      collegeId: req.user._id,
      isActive: true,
      'leetcodeStats.totalSolved': { $gt: 0 }
    });

    const totalSolved = await User.aggregate([
      { $match: { collegeId: req.user._id, isActive: true } },
      { $group: { _id: null, total: { $sum: '$leetcodeStats.totalSolved' } } }
    ]);

    const topPerformers = await User.find({ 
      collegeId: req.user._id,
      isActive: true 
    })
    .sort({ 'leetcodeStats.totalSolved': -1 })
    .limit(5)
    .select('name department year leetcodeStats');

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalSolved: totalSolved[0]?.total || 0,
        topPerformers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getDisplaySettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id).select('displaySettings');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
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
    ...(stored.ranking || {})
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

export const updateDisplaySettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id).select('displaySettings');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const current = admin.displaySettings || {};
    const { leaderboard, dashboard,ranking } = req.body || {};

    const updated = {
      leaderboard: {
        ...defaultDisplaySettings.leaderboard,
        ...(current.leaderboard || {}),
        ...(leaderboard || {})
      },
      dashboard: {
        ...defaultDisplaySettings.dashboard,
        ...(current.dashboard || {}),
        ...(dashboard || {})
      },
      ranking: {
        ...defaultDisplaySettings.ranking,
        ...(current.ranking || {}),
        ...(ranking || {})
      }
    };

    admin.displaySettings = updated;
    await admin.save();

    res.status(200).json({
      success: true,
      settings: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({})
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: admins.length,
      admins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new admin
// @route   POST /api/admin
// @access  Private/SuperAdmin
export const createAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      collegeName,
      phoneNumber,
      yearsOfExperience,
      linkedinUsername
    } = req.body;

    // Check if admin with email or college already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [
        { email },
        { collegeName }
      ] 
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email or college already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      collegeName,
      phoneNumber,
      yearsOfExperience,
      linkedinUsername,
      role: 'admin',
      createdBy: req.user._id
    });

    // Remove password from response
    const adminData = admin.toObject();
    delete adminData.password;

    res.status(201).json({
      success: true,
      admin: adminData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update admin
// @route   PUT /api/admin/:id
// @access  Private/SuperAdmin
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing role or createdBy
    delete updates.role;
    delete updates.createdBy;

    // If password is being updated, hash it
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const admin = await Admin.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      admin
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admin/:id
// @access  Private/SuperAdmin
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting self
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const admin = await Admin.findByIdAndDelete(id).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // TODO: Consider what to do with users belonging to this admin
    // Option 1: Delete all users
    // await User.deleteMany({ collegeId: id });
    
    // Option 2: Orphan the users (set collegeId to null)
    // await User.updateMany({ collegeId: id }, { $set: { collegeId: null } });

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all users for a specific admin
// @route   GET /api/admin/:adminId/users
// @access  Private/SuperAdmin
export const getAdminUsers = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Verify admin exists
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const users = await User.find({ collegeId: adminId })
      .select('-password')
      .sort({ 'leetcodeStats.totalSolved': -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get super admin dashboard stats
// @route   GET /api/admin/dashboard/stats
// @access  Private/SuperAdmin
export const getSuperAdminStats = async (req, res) => {
  try {
    const totalAdmins = await Admin.countDocuments({ role: 'admin' });
    const totalSuperAdmins = await Admin.countDocuments({ role: 'superadmin' });
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ isActive: true });
    const blockedUsers = await User.countDocuments({ isBlocked: true });

    // Get admin with most users
    const adminWithMostUsers = await User.aggregate([
      { $match: { collegeId: { $ne: null } } },
      { $group: { _id: '$collegeId', userCount: { $sum: 1 } } },
      { $sort: { userCount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'admins',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      { $unwind: '$admin' },
      {
        $project: {
          _id: '$admin._id',
          name: '$admin.name',
          collegeName: '$admin.collegeName',
          userCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalAdmins,
        totalSuperAdmins,
        totalUsers,
        activeUsers,
        blockedUsers,
        adminWithMostUsers: adminWithMostUsers[0] || null
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all colleges
// @route   GET /api/admin/colleges
// @access  Private/SuperAdmin
export const getAllColleges = async (req, res) => {
  try {
    const colleges = await Admin.find({ role: 'admin' })
      .select('collegeName email phoneNumber isActive')
      .sort({ collegeName: 1 });

    res.status(200).json({
      success: true,
      count: colleges.length,
      colleges
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update superadmin profile
// @route   PUT /api/admin/superadmin/profile
// @access  Private/SuperAdmin
export const updateSuperAdminProfile = async (req, res) => {
  try {
    const { name, phoneNumber, linkedinUsername, githubUsername, yearsOfExperience } = req.body;

    console.log('Update request received:', {
      userId: req.user._id,
      body: req.body
    });

    // Find the superadmin
    const superadmin = await SuperAdmin.findById(req.user._id);
    if (!superadmin) {
      console.log('Superadmin not found with ID:', req.user._id);
      return res.status(404).json({
        success: false,
        message: 'Superadmin not found'
      });
    }

    console.log('Superadmin found:', superadmin.email);

    // Update allowed fields
    if (name) superadmin.name = name;
    if (phoneNumber !== undefined) superadmin.phoneNumber = phoneNumber;
    if (linkedinUsername !== undefined) superadmin.linkedinUsername = linkedinUsername;
    if (githubUsername !== undefined) superadmin.githubUsername = githubUsername;
    if (yearsOfExperience !== undefined) superadmin.yearsOfExperience = yearsOfExperience;

    await superadmin.save();

    console.log('Superadmin updated successfully:', {
      name: superadmin.name,
      phoneNumber: superadmin.phoneNumber
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: superadmin._id,
        name: superadmin.name,
        email: superadmin.email,
        role: superadmin.role,
        phoneNumber: superadmin.phoneNumber,
        yearsOfExperience: superadmin.yearsOfExperience,
        linkedinUsername: superadmin.linkedinUsername,
        githubUsername: superadmin.githubUsername,
        profilePicture: superadmin.profilePicture
      }
    });
  } catch (error) {
    console.error('Update superadmin profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get ranking weights
// @route   GET /api/admin/ranking-weights
// @access  Private/SuperAdmin
export const getRankingWeights = async (req, res) => {
  try {
    const superadmin = await SuperAdmin.findById(req.user._id).select('rankingWeights');
    
    if (!superadmin) {
      return res.status(404).json({
        success: false,
        message: 'Superadmin not found'
      });
    }

    const defaultWeights = {
      leetcodeGlobalRank: 1,
      leetcodeContestRating: 1,
      leetcodeTotalSolved: 1,
      githubTotalRepositories: 1,
      githubTotalPRs: 1,
      githubMergedPRs: 1,
      gfgTotalSolved: 1,
      gfgContestRating: 1
    };

    const weights = {
      ...defaultWeights,
      ...superadmin.rankingWeights
    };

    res.status(200).json({
      success: true,
      weights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update ranking weights
// @route   PUT /api/admin/ranking-weights
// @access  Private/SuperAdmin
export const updateRankingWeights = async (req, res) => {
  try {
    const { weights } = req.body;

    // Validate weights
    const validKeys = [
      'leetcodeGlobalRank',
      'leetcodeContestRating',
      'leetcodeTotalSolved',
      'githubTotalRepositories',
      'githubTotalPRs',
      'githubMergedPRs',
      'gfgTotalSolved',
      'gfgContestRating'
    ];

    const validatedWeights = {};
    for (const key of validKeys) {
      if (weights[key] !== undefined) {
        const value = parseFloat(weights[key]);
        if (isNaN(value) || value < 0 || value > 10) {
          return res.status(400).json({
            success: false,
            message: `Weight for ${key} must be between 0 and 10`
          });
        }
        validatedWeights[key] = value;
      }
    }

    const superadmin = await SuperAdmin.findByIdAndUpdate(
      req.user._id,
      { rankingWeights: validatedWeights },
      { new: true, runValidators: true }
    ).select('rankingWeights');

    if (!superadmin) {
      return res.status(404).json({
        success: false,
        message: 'Superadmin not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ranking weights updated successfully',
      weights: superadmin.rankingWeights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload Super Admin Profile Picture
// @route   PUT /api/admin/superadmin/profile-picture
// @access  Private/SuperAdmin
export const uploadSuperAdminProfilePicture = async (req, res) => {
  try {
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture is required'
      });
    }

    const superadmin = await SuperAdmin.findById(req.user._id);
    if (!superadmin) {
      return res.status(404).json({
        success: false,
        message: 'Superadmin not found'
      });
    }

    // Store the base64 image directly in the database
    superadmin.profilePicture = profilePicture;
    await superadmin.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      user: {
        id: superadmin._id,
        name: superadmin.name,
        email: superadmin.email,
        role: superadmin.role,
        phoneNumber: superadmin.phoneNumber,
        yearsOfExperience: superadmin.yearsOfExperience,
        linkedinUsername: superadmin.linkedinUsername,
        githubUsername: superadmin.githubUsername,
        profilePicture: superadmin.profilePicture
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
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
  updateRankingWeights
};