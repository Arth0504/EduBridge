const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');
const {
  createTeacherAssignment,
  getTeacherAssignments,
  getAssignmentsByTeacherId,
  updateTeacherAssignment,
  deleteTeacherAssignment
} = require('../controllers/teacherAssignment.controller');

router.use(protect);
router.use(checkInstitutionActive);

router.route('/')
  .post(authorizeRoles('super_admin', 'institution_admin'), createTeacherAssignment)
  .get(getTeacherAssignments);

router.get('/teacher/:teacherId', getAssignmentsByTeacherId);

router.route('/:id')
  .patch(authorizeRoles('super_admin', 'institution_admin'), updateTeacherAssignment)
  .delete(authorizeRoles('super_admin', 'institution_admin'), deleteTeacherAssignment);

module.exports = router;
