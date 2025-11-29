import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try User -> Admin -> SuperAdmin
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) req.user = await Admin.findById(decoded.id).select('-password');
      if (!req.user) req.user = await SuperAdmin.findById(decoded.id).select('-password');

      if (!req.user) return res.status(401).json({ message: 'User not found' });
      if (req.user.isBlocked) {
        return res.status(403).json({ message: 'Your account has been blocked. Please contact admin.', reason: req.user.blockedReason });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to check if user is admin
export const isAdmin = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    if (req.user==process.env.isAdmin) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error in admin check' });
  }
};
export const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) next();
  else res.status(403).json({ message: 'Not authorized as an admin' });
};

export const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') next();
  else res.status(403).json({ message: 'Not authorized as a super admin' });
};