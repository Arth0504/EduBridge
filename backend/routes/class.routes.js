const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');
const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deactivateClass
} = require('../controllers/class.controller');

router.use(protect);
router.use(checkInstitutionActive);

router.route('/')
  .post(authorizeRoles('super_admin', 'institution_admin'), createClass)
  .get(getClasses);

router.route('/:id')
  .get(getClassById)
  .patch(authorizeRoles('super_admin', 'institution_admin'), updateClass);

router.patch('/:id/deactivate', authorizeRoles('super_admin', 'institution_admin'), deactivateClass);

module.exports = router;
