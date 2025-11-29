import jwt from 'jsonwebtoken';

/**
 * Generate JWT token
 * @param {string} userId - User ID to include in the token
 * @returns {string} JWT token
 */
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
};
