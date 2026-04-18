const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const upload = require('../middleware/upload');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role,
      email: user.email 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user (worker or employer)
// @access  Public
router.post('/register', upload.single('profileImage'), async (req, res) => {
  try {
    console.log('Registration request received');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    
    // Manual validation for FormData fields
    const { name, email, phone, password, role, location, ...roleSpecificData } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }
    if (!phone || phone.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    if (!role || !['worker', 'employer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either worker or employer'
      });
    }

    // Handle profile image path
    let profileImage = '';
    if (req.file) {
      profileImage = `/uploads/${req.file.filename}`;
    }

    // Parse location and roleSpecificData if they come as strings (from FormData)
    let parsedLocation = location;
    if (typeof location === 'string') {
      try {
        parsedLocation = JSON.parse(location);
      } catch (e) {
        console.log('Location parsing failed, using raw value');
      }
    }

    let parsedRoleData = { ...roleSpecificData };
    
    // Special handling for skills
    if (parsedRoleData.skills && typeof parsedRoleData.skills === 'string') {
      try {
        parsedRoleData.skills = JSON.parse(parsedRoleData.skills);
      } catch (e) {
        parsedRoleData.skills = parsedRoleData.skills.split(',').map(s => s.trim());
      }
    }
    
    // Special handling for experience
    if (parsedRoleData.experience && typeof parsedRoleData.experience === 'string') {
      try {
        parsedRoleData.experience = JSON.parse(parsedRoleData.experience);
      } catch (e) {}
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    let user;
    if (role === 'worker') {
      user = new Worker({
        name,
        email,
        phone,
        password,
        role,
        location: parsedLocation,
        profileImage,
        ...parsedRoleData
      });
    } else {
      user = new Employer({
        name,
        email,
        phone,
        password,
        role,
        location: parsedLocation,
        profileImage,
        ...parsedRoleData
      });
    }

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location
      }
    });
  } catch (error) {
    console.error('Registration error details:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message,
      details: error.errors ? Object.values(error.errors).map(e => e.message) : []
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either email or phone number'
      });
    }
    // Prepare search query
    const searchConditions = [];
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      searchConditions.push({ email: trimmedEmail });
      // If email field contains only numbers, it might be a phone number
      if (/^\d+$/.test(trimmedEmail)) {
        searchConditions.push({ phone: trimmedEmail });
      }
    }
    if (phone) {
      searchConditions.push({ phone });
    }
    console.log('Login attempt for:', { email, phone });
    // Find user by email or phone
    const user = await User.findOne({
      $or: searchConditions
    }).select('+password');

    if (!user) {
      console.log('User not found for conditions:', searchConditions);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Compare password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      console.log('Password mismatch for user:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  try {
    console.log('Fetching user data for:', req.user.id, 'role:', req.user.role);
    let user;
    
    // Check user role and fetch appropriate model
    if (req.user.role === 'employer') {
      user = await Employer.findById(req.user.id).select('-password');
    } else if (req.user.role === 'worker') {
      user = await Worker.findById(req.user.id).select('-password');
    } else {
      user = await User.findById(req.user.id).select('-password');
    }
    
    console.log('Found user:', user);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
});

// @route   POST /api/auth/forgotpassword
// @desc    Forgot password
// @access  Public
router.post('/forgotpassword', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email'
      });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour

    await user.save();

    // Create reset url
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const emailTemplate = emailTemplates.passwordReset(resetUrl);

    try {
      await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });

      console.log('Reset password email sent successfully');
      res.status(200).json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    } catch (error) {
      console.error('Inner Email Error:', error.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save();

      return res.status(500).json({
        success: false,
        message: `Email could not be sent. Please check your email configuration. Error: ${error.message}`
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password',
      error: error.message
    });
  }
});

// @route   PUT /api/auth/resetpassword/:resettoken
// @desc    Reset password
// @access  Public
router.post('/resetpassword/:resettoken', async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP to email for verification
// @access  Public
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    // Generate OTP
    const { generateOTP, otpStore, sendEmail, emailTemplates } = require('../utils/emailService');
    const otp = generateOTP();
    
    // Store OTP with expiration (10 minutes)
    otpStore.set(email, {
      otp: otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    // Send OTP email
    const emailData = emailTemplates.otpVerification(otp);
    await sendEmail({
      to: email,
      subject: emailData.subject,
      html: emailData.html
    });
    
    res.json({
      success: true,
      message: 'OTP sent successfully to your email'
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP',
      error: error.message
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP for email verification
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }
    
    const storedOtpData = require('../utils/emailService').otpStore.get(email);
    
    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired'
      });
    }
    
    // Check expiration
    if (Date.now() > storedOtpData.expiresAt) {
      // Remove expired OTP
      require('../utils/emailService').otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }
    
    // Verify OTP
    if (storedOtpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
    
    // OTP verified - remove it from store
    require('../utils/emailService').otpStore.delete(email);
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message
    });
  }
});

module.exports = router;
