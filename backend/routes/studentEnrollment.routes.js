const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');
const {
  createStudentEnrollment,
  getStudentEnrollments,
  getEnrollmentsByStudentId,
  getEnrollmentsByClassId,
  updateStudentEnrollment,
  transferStudentEnrollment
} = require('../controllers/studentEnrollment.controller');

router.use(protect);
router.use(checkInstitutionActive);

router.route('/')
  .post(authorizeRoles('super_admin', 'institution_admin'), createStudentEnrollment)
  .get(getStudentEnrollments);

router.get('/student/:studentId', getEnrollmentsByStudentId);
router.get('/class/:classId', getEnrollmentsByClassId);

router.route('/:id')
  .patch(authorizeRoles('super_admin', 'institution_admin'), updateStudentEnrollment);

router.patch('/:id/transfer', authorizeRoles('super_admin', 'institution_admin'), transferStudentEnrollment);

module.exports = router;
