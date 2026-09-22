const express = require('express');
const {
  registerInstitution,
  getAllInstitutions,
  getPendingInstitutions,
  getInstitutionById,
  approveInstitution,
  rejectInstitution,
  suspendInstitution,
  reactivateInstitution,
  getMyInstitution,
  updateMyInstitution
} = require('../controllers/institution.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

// Public Endpoint: Institution Onboarding Request Submission
router.post('/register', registerInstitution);

// Institution Admin Endpoints (Protected: institution_admin only)
router.get(
  '/my-institution',
  protect,
  authorizeRoles('institution_admin'),
  tenantIsolation,
  checkInstitutionActive,
  getMyInstitution
);
router.patch(
  '/my-institution',
  protect,
  authorizeRoles('institution_admin'),
  tenantIsolation,
  checkInstitutionActive,
  updateMyInstitution
);

// Super Admin Endpoints (Protected: super_admin only)
router.get('/', protect, authorizeRoles('super_admin'), getAllInstitutions);
router.get('/pending', protect, authorizeRoles('super_admin'), getPendingInstitutions);
router.get('/:id', protect, authorizeRoles('super_admin'), getInstitutionById);
router.patch('/:id/approve', protect, authorizeRoles('super_admin'), approveInstitution);
router.patch('/:id/reject', protect, authorizeRoles('super_admin'), rejectInstitution);
router.patch('/:id/suspend', protect, authorizeRoles('super_admin'), suspendInstitution);
router.patch('/:id/reactivate', protect, authorizeRoles('super_admin'), reactivateInstitution);

module.exports = router;
