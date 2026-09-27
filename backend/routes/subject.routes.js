const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');
const {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deactivateSubject
} = require('../controllers/subject.controller');

router.use(protect);
router.use(checkInstitutionActive);

router.route('/')
  .post(authorizeRoles('super_admin', 'institution_admin'), createSubject)
  .get(getSubjects);

router.route('/:id')
  .get(getSubjectById)
  .patch(authorizeRoles('super_admin', 'institution_admin'), updateSubject);

router.patch('/:id/deactivate', authorizeRoles('super_admin', 'institution_admin'), deactivateSubject);

module.exports = router;
