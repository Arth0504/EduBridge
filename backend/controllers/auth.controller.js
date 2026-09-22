const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  validateRegisterInput,
  validateLoginInput,
  validateChangePasswordInput
} = require('../validations/auth.validation');
const logger = require('../utils/logger');

/**
 * @desc    Public Registration (Students and Parents ONLY)
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { isValid, errors, sanitizedRole } = validateRegisterInput(req.body);

    if (!isValid) {
      return sendError(res, 400, errors.join(' '));
    }

    const { fullName, email, password, phone, institutionId } = req.body;

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 400, 'User with this email address already exists.');
    }

    // Create User Document
    const user = await User.create({
      fullName,
      email,
      password,
      phone: phone || '',
      role: sanitizedRole,
      institutionId: institutionId || null
    });

    const token = generateToken(user);

    logger.info(`New ${sanitizedRole} registered: ${user.email}`);

    return sendSuccess(res, 201, 'User registered successfully', {
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User Login
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { isValid, errors } = validateLoginInput(req.body);

    if (!isValid) {
      return sendError(res, 400, errors.join(' '));
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return sendError(res, 401, 'Invalid email address or password.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email address or password.');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Your account has been deactivated. Please contact administrator.');
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    logger.info(`User logged in successfully: ${user.email} (${user.role})`);

    return sendSuccess(res, 200, 'Authentication successful', {
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Logged-in User Profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'User profile retrieved successfully', {
      user: req.user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User Logout (Client session invalidation)
 * @route   POST /api/v1/auth/logout
 * @access  Private / Public
 */
const logout = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Logged out successfully. Token cleared on client.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change User Password
 * @route   PATCH /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { isValid, errors } = validateChangePasswordInput(req.body);

    if (!isValid) {
      return sendError(res, 400, errors.join(' '));
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 400, 'Current password is incorrect.');
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    return sendSuccess(res, 200, 'Password changed successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Protected Route Test Endpoint
 * @route   GET /api/v1/auth/protected-test
 * @access  Private
 */
const getProtectedTest = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Protected route access verified', {
      authenticatedUser: req.user.toSafeObject(),
      grantedRole: req.user.role,
      institutionContext: req.institutionId || 'global',
      serverTimestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  changePassword,
  getProtectedTest
};
