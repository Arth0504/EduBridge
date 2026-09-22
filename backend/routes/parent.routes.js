const express = require('express');
const {
  getParents,
  getParentById,
  createParent,
  updateParent
} = require('../controllers/parent.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(protect, checkInstitutionActive);

router.get('/', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getParents);
router.post('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, createParent);

router.get('/:id', tenantIsolation, getParentById);
router.patch('/:id', tenantIsolation, updateParent);

module.exports = router;
