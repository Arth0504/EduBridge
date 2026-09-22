const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  changePassword,
  getProtectedTest
} = require('../controllers/auth.controller');
const { protect, tenantIsolation } = require('../middleware/auth.middleware');

const router = express.Router();

// Public Authentication Routes
router.post('/register', register);
router.post('/login', login);

// Protected Authentication Routes
router.get('/me', protect, tenantIsolation, getMe);
router.post('/logout', protect, logout);
router.patch('/change-password', protect, changePassword);
router.get('/protected-test', protect, tenantIsolation, getProtectedTest);

module.exports = router;
