// controllers/otpController.js
import User from '../models/User.js';
import { generateOTP, storeOTP, verifyOTP as verifyStoredOTP } from '../services/otpService.js';
import { generateToken } from '../utils/auth.js';
import { sendOtpEmail } from '../services/emailService.js';

// @desc    Send OTP to user's email
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate and store OTP
    const otp = generateOTP();
    console.log("OTP has been generated:", otp);
    await storeOTP(email, otp);

    // Send OTP via email
    const emailResult = await sendOtpEmail(email, otp);
    
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // Still return success since OTP was generated and stored
    }

    res.status(200).json({ 
      message: 'OTP sent successfully',
      // In development, send OTP in response for testing
      ...(process.env.NODE_ENV !== 'production' && { otp }) 
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};
// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const isValid = await verifyStoredOTP(email, otp);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Get user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Return user and token
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};