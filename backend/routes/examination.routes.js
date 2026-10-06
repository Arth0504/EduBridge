const express = require('express');
const {
  createExamination,
  getExaminations,
  getExaminationById,
  updateExamination,
  updateExaminationStatus,
  deleteExamination
} = require('../controllers/examination.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(protect, checkInstitutionActive);

router.get('/', tenantIsolation, getExaminations);
router.get('/:id', tenantIsolation, getExaminationById);

router.post('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, createExamination);
router.patch('/:id', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, updateExamination);
router.patch('/:id/status', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, updateExaminationStatus);
router.delete('/:id', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, deleteExamination);

module.exports = router;
