// services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send OTP to user's email
 * @param {string} to - Recipient email address
 * @param {string} otp - OTP to send
 * @returns {Promise<Object>} Result of the email sending operation
 */
export const sendOtpEmail = async (to, otp) => {
  try {
    const mailOptions = {
      from: `"CampusRank" <${process.env.EMAIL_USERNAME}>`,
      to,
      subject: 'Your OTP for CampusRank',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4a90e2;">CampusRank - OTP Verification</h2>
          <p>Hello,</p>
          <p>Your OTP for login is:</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #333;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <p>Best regards,<br/>The CampusRank Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};