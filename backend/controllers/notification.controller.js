const Notification = require('../models/Notification');
const NotificationRead = require('../models/NotificationRead');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logAuditEvent } = require('../utils/auditLogger');
const {
  validateCreateNotificationInput,
  validateUpdateNotificationInput
} = require('../validations/notification.validation');
const {
  createNotification,
  getNotificationsForUser,
  getUnreadCountForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../services/notification.service');

/**
 * POST /api/v1/notifications
 * Create a new announcement/notification
 */
const createNotificationController = async (req, res, next) => {
  try {
    const { isValid, errors, sanitized } = validateCreateNotificationInput(req.body);

    if (!isValid) {
      return sendError(res, 400, `Validation Error: ${errors.join(' ')}`, errors);
    }

    const userRole = req.user.role.toLowerCase();

    // Authorization: Only super_admin and institution_admin can create institution announcements
    if (userRole !== 'super_admin' && userRole !== 'institution_admin') {
      return sendError(res, 403, 'Forbidden: Only institution administrators and super admins can create announcements.');
    }

    let institutionId = null;
    if (userRole === 'super_admin') {
      institutionId = req.body.institutionId || (req.user.institutionId ? req.user.institutionId.toString() : null);
    } else {
      institutionId = req.user.institutionId ? req.user.institutionId.toString() : null;
      if (!institutionId) {
        return sendError(res, 403, 'Forbidden: You are not assigned to an active institution.');
      }
    }

    // Validate targetUserIds if specific_users selected
    if (sanitized.targetAudience === 'specific_users') {
      const targetUsers = await User.find({ _id: { $in: sanitized.targetUserIds } });

      if (targetUsers.length !== sanitized.targetUserIds.length) {
        return sendError(res, 400, 'Validation Error: One or more target user accounts do not exist.');
      }

      // Ensure target users belong to same institution (if non-super_admin)
      if (userRole !== 'super_admin') {
        const invalidTenantUsers = targetUsers.filter(
          u => !u.institutionId || u.institutionId.toString() !== institutionId
        );
        if (invalidTenantUsers.length > 0) {
          return sendError(res, 400, 'Validation Error: Cannot target users belonging to another institution.');
        }
      }
    }

    const newNotification = await createNotification({
      ...sanitized,
      senderId: req.user._id,
      senderRole: userRole,
      institutionId
    });

    const isScheduled = sanitized.scheduledAt && new Date(sanitized.scheduledAt) > new Date() && !sanitized.isPublished;
    const actionName = isScheduled ? 'NOTIFICATION_SCHEDULED' : 'NOTIFICATION_CREATED';

    await logAuditEvent({
      actor: req.user,
      action: actionName,
      institutionId,
      details: {
        notificationId: newNotification._id,
        title: newNotification.title,
        targetAudience: newNotification.targetAudience,
        type: newNotification.type,
        priority: newNotification.priority,
        isPublished: newNotification.isPublished
      },
      req
    });

    return sendSuccess(res, 201, 'Notification created successfully', newNotification);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications
 * Fetch notifications available to the authenticated user
 */
const getNotificationsController = async (req, res, next) => {
  try {
    const result = await getNotificationsForUser(req.user, req.query);
    return sendSuccess(res, 200, 'Notifications retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/unread-count
 * Return total count of unread notifications for authenticated user
 */
const getUnreadCountController = async (req, res, next) => {
  try {
    const unreadCount = await getUnreadCountForUser(req.user);
    return sendSuccess(res, 200, 'Unread count retrieved successfully', { unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/:id
 * Return notification details if user is authorized
 */
const getNotificationByIdController = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, isActive: true })
      .populate('senderId', 'fullName email role')
      .populate('institutionId', 'institutionName');

    if (!notification) {
      return sendError(res, 404, 'Notification not found.');
    }

    const role = req.user.role.toLowerCase();

    // Tenant Check
    if (role !== 'super_admin') {
      if (notification.institutionId && notification.institutionId._id.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: You do not have access to notifications outside your institution.');
      }
    }

    // Role Audience Check
    if (role === 'student') {
      const allowed =
        notification.targetAudience === 'all' ||
        notification.targetAudience === 'students' ||
        (notification.targetAudience === 'specific_users' &&
          notification.targetUserIds.some(id => id.toString() === req.user._id.toString()));
      if (!allowed) {
        return sendError(res, 403, 'Forbidden: You are not an authorized recipient of this notification.');
      }
    } else if (role === 'teacher') {
      const allowed =
        notification.targetAudience === 'all' ||
        notification.targetAudience === 'teachers' ||
        (notification.targetAudience === 'specific_users' &&
          notification.targetUserIds.some(id => id.toString() === req.user._id.toString()));
      if (!allowed) {
        return sendError(res, 403, 'Forbidden: You are not an authorized recipient of this notification.');
      }
    } else if (role === 'parent') {
      const allowed =
        notification.targetAudience === 'all' ||
        notification.targetAudience === 'parents' ||
        (notification.targetAudience === 'specific_users' &&
          notification.targetUserIds.some(id => id.toString() === req.user._id.toString()));
      if (!allowed) {
        return sendError(res, 403, 'Forbidden: You are not an authorized recipient of this notification.');
      }
    }

    // Check read status
    const readRecord = await NotificationRead.findOne({
      notificationId: notification._id,
      userId: req.user._id
    });

    const notifObj = notification.toObject();
    notifObj.isRead = Boolean(readRecord);

    return sendSuccess(res, 200, 'Notification details retrieved successfully', notifObj);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark notification as read
 */
const markAsReadController = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, isActive: true });
    if (!notification) {
      return sendError(res, 404, 'Notification not found.');
    }

    const role = req.user.role.toLowerCase();
    if (role !== 'super_admin' && notification.institutionId && notification.institutionId.toString() !== req.user.institutionId.toString()) {
      return sendError(res, 403, 'Forbidden: Cross-institution notification operation blocked.');
    }

    await markNotificationAsRead(req.params.id, req.user._id);
    return sendSuccess(res, 200, 'Notification marked as read successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all currently visible notifications as read for current user
 */
const markAllAsReadController = async (req, res, next) => {
  try {
    const result = await markAllNotificationsAsRead(req.user);
    return sendSuccess(res, 200, 'All visible notifications marked as read', result);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id
 * Update notification details / publish status
 */
const updateNotificationController = async (req, res, next) => {
  try {
    const { isValid, errors } = validateUpdateNotificationInput(req.body);
    if (!isValid) {
      return sendError(res, 400, `Validation Error: ${errors.join(' ')}`, errors);
    }

    const notification = await Notification.findOne({ _id: req.params.id, isActive: true });
    if (!notification) {
      return sendError(res, 404, 'Notification not found.');
    }

    const role = req.user.role.toLowerCase();

    // Authorization: super_admin, or institution_admin of same institution, or original sender
    if (role !== 'super_admin') {
      if (role !== 'institution_admin' || notification.institutionId?.toString() !== req.user.institutionId?.toString()) {
        if (notification.senderId.toString() !== req.user._id.toString()) {
          return sendError(res, 403, 'Forbidden: You are not authorized to edit this notification.');
        }
      }
    }

    const {
      title,
      message,
      type,
      priority,
      targetAudience,
      targetUserIds,
      scheduledAt,
      expiresAt,
      isPublished
    } = req.body;

    if (targetAudience === 'specific_users' || (notification.targetAudience === 'specific_users' && targetUserIds)) {
      const userIdsToCheck = targetUserIds || notification.targetUserIds;
      if (role !== 'super_admin') {
        const targetUsers = await User.find({ _id: { $in: userIdsToCheck } });
        const invalidTenantUsers = targetUsers.filter(
          u => !u.institutionId || u.institutionId.toString() !== req.user.institutionId.toString()
        );
        if (invalidTenantUsers.length > 0) {
          return sendError(res, 400, 'Validation Error: Target users must belong to your institution.');
        }
      }
    }

    if (title !== undefined) notification.title = title.trim();
    if (message !== undefined) notification.message = message.trim();
    if (type !== undefined) notification.type = type.toLowerCase();
    if (priority !== undefined) notification.priority = priority.toLowerCase();
    if (targetAudience !== undefined) notification.targetAudience = targetAudience.toLowerCase();
    if (targetUserIds !== undefined) notification.targetUserIds = targetUserIds;
    if (scheduledAt !== undefined) notification.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (expiresAt !== undefined) notification.expiresAt = expiresAt ? new Date(expiresAt) : null;

    if (isPublished !== undefined) {
      notification.isPublished = Boolean(isPublished);
      if (notification.isPublished && !notification.publishedAt) {
        notification.publishedAt = new Date();
      }
    }

    await notification.save();

    await logAuditEvent({
      actor: req.user,
      action: notification.isPublished ? 'NOTIFICATION_PUBLISHED' : 'NOTIFICATION_UPDATED',
      institutionId: notification.institutionId,
      details: {
        notificationId: notification._id,
        title: notification.title,
        isPublished: notification.isPublished
      },
      req
    });

    return sendSuccess(res, 200, 'Notification updated successfully', notification);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/notifications/:id
 * Soft-delete / deactivate notification
 */
const deleteNotificationController = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, isActive: true });
    if (!notification) {
      return sendError(res, 404, 'Notification not found.');
    }

    const role = req.user.role.toLowerCase();

    // Authorization check
    if (role !== 'super_admin') {
      if (role !== 'institution_admin' || notification.institutionId?.toString() !== req.user.institutionId?.toString()) {
        if (notification.senderId.toString() !== req.user._id.toString()) {
          return sendError(res, 403, 'Forbidden: You are not authorized to delete this notification.');
        }
      }
    }

    notification.isActive = false;
    await notification.save();

    await logAuditEvent({
      actor: req.user,
      action: 'NOTIFICATION_DELETED',
      institutionId: notification.institutionId,
      details: {
        notificationId: notification._id,
        title: notification.title
      },
      req
    });

    return sendSuccess(res, 200, 'Notification deactivated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotificationController,
  getNotificationsController,
  getUnreadCountController,
  getNotificationByIdController,
  markAsReadController,
  markAllAsReadController,
  updateNotificationController,
  deleteNotificationController
};
