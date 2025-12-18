import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  profilePicture: {
    type: String,
    default: ''
  },
  leetcodeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  gfgId: {
    type: String,
    trim: true
  },
  githubUsername: {
    type: String,
    trim: true
  },
  linkedinUsername: {
    type: String,
    trim: true
  },
  collegeName: {
    type: String,
    trim: true
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  department: {
    type: String,
    trim: true
  },
  year: {
    type: Number,
    min: 1,
    max: 4
  },
  cgpa: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  role: {
    type: String,
    enum: ['user'],
    default: 'user'
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String,
    default: ''
  },
  leetcodeStats: {
    totalSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    ranking: { type: Number, default: 0 },
    contestRating: { type: Number, default: 0 },
    attendedContestsCount: { type: Number, default: 0 },
    reputation: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  gfgStats: {
    totalSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    codingScore: { type: Number, default: 0 },
    contestRating: { type: Number, default: 0 },
    instituteRank: { type: String, default: '' },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  githubStats: {
    totalRepositories: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    totalStars: { type: Number, default: 0 },
    totalForks: { type: Number, default: 0 },
    totalPRs: { type: Number, default: 0 },
    openPRs: { type: Number, default: 0 },
    closedPRs: { type: Number, default: 0 },
    mergedPRs: { type: Number, default: 0 },
    contributions: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Indexes are already defined inline in the schema with unique: true and sparse: true

const User = mongoose.model('User', userSchema);

export default User;