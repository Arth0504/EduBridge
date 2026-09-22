const express = require('express');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus
} = require('../controllers/student.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(protect, checkInstitutionActive);

router.get('/', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getStudents);
router.post('/', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, createStudent);

router.get('/:id', tenantIsolation, getStudentById);
router.patch('/:id', tenantIsolation, updateStudent);
router.patch('/:id/status', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, updateStudentStatus);

module.exports = router;
