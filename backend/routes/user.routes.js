const express = require('express');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser
} = require('../controllers/user.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

// Apply auth protection & active institution check across user management endpoints
router.use(protect, checkInstitutionActive);

router.get('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, getUsers);
router.post('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, createUser);

router.get('/:id', tenantIsolation, getUserById);
router.patch('/:id', tenantIsolation, updateUser);
router.patch('/:id/status', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, updateUserStatus);
router.delete('/:id', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, deleteUser);

module.exports = router;
