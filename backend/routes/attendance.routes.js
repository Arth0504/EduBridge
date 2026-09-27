const express = require('express');
const {
  createOrUpdateAttendance,
  bulkSubmitAttendance,
  getAttendanceRecords,
  getStudentAttendance,
  getClassSectionAttendance,
  getDailyAttendance,
  updateAttendanceById,
  deleteAttendanceById,
  getStudentSummary,
  getClassSummary,
  getAttendanceReports
} = require('../controllers/attendance.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

// Apply auth protection & active institution check across all attendance endpoints
router.use(protect, checkInstitutionActive);

// 1. Reports & Summary Endpoints
router.get('/reports', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getAttendanceReports);
router.get('/summary/student/:studentId', tenantIsolation, getStudentSummary);
router.get('/summary/class/:classId', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getClassSummary);
router.get('/summary', tenantIsolation, (req, res, next) => {
  if (req.query.studentId) return getStudentSummary(req, res, next);
  if (req.query.classId) return getClassSummary(req, res, next);
  return getAttendanceReports(req, res, next);
});

// 2. Bulk Endpoint
router.post(
  '/bulk',
  authorizeRoles('super_admin', 'institution_admin', 'teacher'),
  tenantIsolation,
  bulkSubmitAttendance
);

// 3. Specialized Date & Class/Section & Student Endpoints
router.get('/date/:date', tenantIsolation, getDailyAttendance);
router.get('/student/:studentId', tenantIsolation, getStudentAttendance);
router.get('/class/:classId/section/:sectionId', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getClassSectionAttendance);
router.get('/class/:classId', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getClassSectionAttendance);

// 4. General List & Create Endpoints
router.get('/', tenantIsolation, getAttendanceRecords);
router.post(
  '/',
  authorizeRoles('super_admin', 'institution_admin', 'teacher'),
  tenantIsolation,
  createOrUpdateAttendance
);

// 5. ID-Based Edit & Delete Endpoints
router.patch(
  '/:id',
  authorizeRoles('super_admin', 'institution_admin', 'teacher'),
  tenantIsolation,
  updateAttendanceById
);
router.delete(
  '/:id',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  deleteAttendanceById
);

module.exports = router;
