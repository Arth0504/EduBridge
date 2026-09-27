const express = require('express');
const {
  createNotificationController,
  getNotificationsController,
  getUnreadCountController,
  getNotificationByIdController,
  markAsReadController,
  markAllAsReadController,
  updateNotificationController,
  deleteNotificationController
} = require('../controllers/notification.controller');
const { protect, authorizeRoles, tenantIsolation } = require('../middleware/auth.middleware');
const { checkInstitutionActive } = require('../middleware/tenant.middleware');

const router = express.Router();

// Apply auth protection & active institution check across all notification endpoints
router.use(protect, checkInstitutionActive);

// Unread count & bulk read routes (placed BEFORE /:id to prevent route pattern collisions)
router.get('/unread-count', tenantIsolation, getUnreadCountController);
router.patch('/read-all', tenantIsolation, markAllAsReadController);

// List & Create routes
router.get('/', tenantIsolation, getNotificationsController);
router.post(
  '/',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  createNotificationController
);

// Specific notification ID operations
router.get('/:id', tenantIsolation, getNotificationByIdController);
router.patch('/:id/read', tenantIsolation, markAsReadController);
router.patch(
  '/:id',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  updateNotificationController
);
router.delete(
  '/:id',
  authorizeRoles('super_admin', 'institution_admin'),
  tenantIsolation,
  deleteNotificationController
);

module.exports = router;
