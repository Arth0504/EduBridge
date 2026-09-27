const express = require('express');
const {
  createOrUpdateAttendance,
  bulkSubmitAttendance,
  getAttendanceRecords,
  getStudentAttendance,
  getClassSectionAttendance,
  getAttendanceSummary,
  updateAttendanceById,
  deleteAttendanceById
} = require('../controllers/attendance.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

// Apply auth protection & active institution check across all attendance endpoints
router.use(protect, checkInstitutionActive);

// Summary & bulk endpoints (placed before /:id routes)
router.get('/summary', tenantIsolation, getAttendanceSummary);
router.post(
  '/bulk',
  authorizeRoles('super_admin', 'institution_admin', 'teacher'),
  tenantIsolation,
  bulkSubmitAttendance
);

// Student & Class/Section specific routes
router.get('/student/:studentId', tenantIsolation, getStudentAttendance);
router.get(
  '/class/:classId/section/:sectionId',
  authorizeRoles('super_admin', 'institution_admin', 'teacher'),
  tenantIsolation,
  getClassSectionAttendance
);

// General list & create routes
router.get('/', tenantIsolation, getAttendanceRecords);
router.post(
  '/',
  authorizeRoles('super_admin', 'institution_admin', 'teacher'),
  tenantIsolation,
  createOrUpdateAttendance
);

// ID-based edit & delete routes
router.patch(
  '/:id',
  authorizeRoles('super_admin', 'institution_admin', 'teacher'),
  tenantIsolation,
  updateAttendanceById
);
router.delete(
  '/:id',
  authorizeRoles('super_admin', 'institution_admin', 'teacher'),
  tenantIsolation,
  deleteAttendanceById
);

module.exports = router;
