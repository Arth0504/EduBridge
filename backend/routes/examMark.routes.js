const express = require('express');
const {
  createOrUpdateSingleExamMark,
  bulkCreateOrUpdateExamMarks,
  getExamMarks,
  updateExamMarkCorrection
} = require('../controllers/examMark.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(protect, checkInstitutionActive);

router.get('/', tenantIsolation, getExamMarks);

router.post('/', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, createOrUpdateSingleExamMark);
router.post('/bulk', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, bulkCreateOrUpdateExamMarks);
router.patch('/:id/correction', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, updateExamMarkCorrection);

module.exports = router;
