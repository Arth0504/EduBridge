const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom
} = require('../controllers/room.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

router.use(protect);
router.use(checkInstitutionActive);
router.use(tenantIsolation);

router.post('/', authorizeRoles('super_admin', 'institution_admin'), createRoom);
router.get('/', getRooms);
router.get('/:id', getRoomById);
router.patch('/:id', authorizeRoles('super_admin', 'institution_admin'), updateRoom);
router.delete('/:id', authorizeRoles('super_admin', 'institution_admin'), deleteRoom);

module.exports = router;
