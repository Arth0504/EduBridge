const express = require('express');
const router = express.Router();
const {
  createTimetable,
  getTimetables,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  getSectionTimetable,
  getTeacherTimetable,
  getStudentTimetable,
  getParentTimetable
} = require('../controllers/timetable.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

router.use(protect);
router.use(checkInstitutionActive);
router.use(tenantIsolation);

router.post('/', authorizeRoles('super_admin', 'institution_admin'), createTimetable);
router.get('/', getTimetables);
router.get('/section/:sectionId', getSectionTimetable);
router.get('/teacher/:teacherId', getTeacherTimetable);
router.get('/student/:studentId', getStudentTimetable);
router.get('/parent/:parentId', getParentTimetable);
router.get('/:id', getTimetableById);
router.patch('/:id', authorizeRoles('super_admin', 'institution_admin'), updateTimetable);
router.delete('/:id', authorizeRoles('super_admin', 'institution_admin'), deleteTimetable);

module.exports = router;
