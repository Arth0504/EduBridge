const express = require('express');
const {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  updateTeacherStatus
} = require('../controllers/teacher.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(protect, checkInstitutionActive);

router.get('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, getTeachers);
router.post('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, createTeacher);

router.get('/:id', tenantIsolation, getTeacherById);
router.patch('/:id', tenantIsolation, updateTeacher);
router.patch('/:id/status', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, updateTeacherStatus);

module.exports = router;
