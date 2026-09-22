const express = require('express');
const {
  getParentChildLinks,
  createParentChildLink,
  removeParentChildLink
} = require('../controllers/parentChildLink.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(protect, checkInstitutionActive);

router.get('/', tenantIsolation, getParentChildLinks);
router.post('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, createParentChildLink);
router.delete('/:id', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, removeParentChildLink);

module.exports = router;
