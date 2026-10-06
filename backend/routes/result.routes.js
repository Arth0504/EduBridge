const express = require('express');
const {
  publishExaminationResults,
  getStudentResult,
  getClassResults,
  getSubjectPerformanceReport,
  getExaminationSummary
} = require('../controllers/result.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(protect, checkInstitutionActive);

// 1. Result publication (Admin only)
router.post('/publish', authorizeRoles('super_admin', 'institution_admin'), tenantIsolation, publishExaminationResults);

// 2. Student detailed result
router.get('/student/:studentId', tenantIsolation, getStudentResult);

// 3. Class / Section result overview (Admin & Teacher)
router.get('/class', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getClassResults);

// 4. Analytics Reports
router.get('/reports/subject-performance', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getSubjectPerformanceReport);
router.get('/reports/exam-summary', authorizeRoles('super_admin', 'institution_admin', 'teacher'), tenantIsolation, getExaminationSummary);

module.exports = router;
