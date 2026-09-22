const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT token
 * @param {Object} user - Mongoose User document or user object
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      institutionId: user.institutionId || null
    },
    process.env.JWT_SECRET || 'edubridge_jwt_secret_fallback_key',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

module.exports = generateToken;
