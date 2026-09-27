const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');
const {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deactivateSection
} = require('../controllers/section.controller');

router.use(protect);
router.use(checkInstitutionActive);

router.route('/')
  .post(authorizeRoles('super_admin', 'institution_admin'), createSection)
  .get(getSections);

router.route('/:id')
  .get(getSectionById)
  .patch(authorizeRoles('super_admin', 'institution_admin'), updateSection);

router.patch('/:id/deactivate', authorizeRoles('super_admin', 'institution_admin'), deactivateSection);

module.exports = router;
