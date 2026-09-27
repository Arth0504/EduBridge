const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');
const {
  createAcademicYear,
  getAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
  activateAcademicYear,
  archiveAcademicYear
} = require('../controllers/academicYear.controller');

router.use(protect);
router.use(checkInstitutionActive);

router.route('/')
  .post(authorizeRoles('super_admin', 'institution_admin'), createAcademicYear)
  .get(getAcademicYears);

router.route('/:id')
  .get(getAcademicYearById)
  .patch(authorizeRoles('super_admin', 'institution_admin'), updateAcademicYear);

router.patch('/:id/activate', authorizeRoles('super_admin', 'institution_admin'), activateAcademicYear);
router.patch('/:id/archive', authorizeRoles('super_admin', 'institution_admin'), archiveAcademicYear);

module.exports = router;
