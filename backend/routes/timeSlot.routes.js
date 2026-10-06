const express = require('express');
const router = express.Router();
const {
  createTimeSlot,
  getTimeSlots,
  getTimeSlotById,
  updateTimeSlot,
  deleteTimeSlot
} = require('../controllers/timeSlot.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

router.use(protect);
router.use(checkInstitutionActive);
router.use(tenantIsolation);

router.post('/', authorizeRoles('super_admin', 'institution_admin'), createTimeSlot);
router.get('/', getTimeSlots);
router.get('/:id', getTimeSlotById);
router.patch('/:id', authorizeRoles('super_admin', 'institution_admin'), updateTimeSlot);
router.delete('/:id', authorizeRoles('super_admin', 'institution_admin'), deleteTimeSlot);

module.exports = router;
