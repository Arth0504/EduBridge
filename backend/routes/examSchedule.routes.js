const express = require('express');
const {
  createExamSchedule,
  getExamSchedules,
  getExamScheduleById,
  updateExamSchedule,
  deleteExamSchedule
} = require('../controllers/examSchedule.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(protect, checkInstitutionActive);

router.get('/', tenantIsolation, getExamSchedules);
router.get('/:id', tenantIsolation, getExamScheduleById);

router.post('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, createExamSchedule);
router.patch('/:id', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, updateExamSchedule);
router.delete('/:id', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, deleteExamSchedule);

module.exports = router;
