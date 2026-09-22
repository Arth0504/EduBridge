const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

/**
 * Middleware: Verify JWT Bearer Token and attach user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 401, 'Authentication failed: Missing Bearer token in authorization header.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'edubridge_jwt_secret_fallback_key');

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return sendError(res, 401, 'Authentication failed: User account no longer exists.');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Account deactivated: Please contact system administration.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Authentication failed: Token has expired. Please log in again.');
    }
    return sendError(res, 401, 'Authentication failed: Invalid or malformed token.');
  }
};

/**
 * Middleware: Role-Based Authorization
 * @param  {...string} roles - Permitted roles (e.g. 'super_admin', 'institution_admin')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required before checking role authorization.');
    }

    const normalizedAllowedRoles = roles.map(r => r.toLowerCase());
    const userRole = (req.user.role || '').toLowerCase();

    if (!normalizedAllowedRoles.includes(userRole)) {
      return sendError(
        res,
        403,
        `Forbidden: Role '${req.user.role}' is not authorized to perform this operation.`
      );
    }

    next();
  };
};

/**
 * Middleware: Multi-tenant institution context isolation
 */
const tenantIsolation = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // Super Admin bypasses single-tenant restriction
  if (req.user.role === 'super_admin') {
    req.institutionId = req.headers['x-institution-id'] || 'global';
  } else {
    // Institution-based users locked strictly to token derived institutionId
    req.institutionId = req.user.institutionId ? req.user.institutionId.toString() : null;
  }

  next();
};

module.exports = {
  protect,
  authorizeRoles,
  tenantIsolation
};
