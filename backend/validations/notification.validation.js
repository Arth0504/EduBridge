const mongoose = require('mongoose');

const VALID_TYPES = ['announcement', 'notice', 'event', 'reminder', 'system'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const VALID_AUDIENCES = ['all', 'students', 'teachers', 'parents', 'specific_users'];

/**
 * Validate Notification Creation Input
 */
const validateCreateNotificationInput = (data) => {
  const errors = [];
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
  } = data;

  // Title validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Notification title is required.');
  } else if (title.trim().length < 3 || title.trim().length > 200) {
    errors.push('Notification title must be between 3 and 200 characters.');
  }

  // Message validation
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    errors.push('Notification message is required.');
  } else if (message.trim().length < 3) {
    errors.push('Notification message must be at least 3 characters long.');
  }

  // Type validation
  if (type && !VALID_TYPES.includes(type.toLowerCase())) {
    errors.push(`Invalid notification type. Allowed values: ${VALID_TYPES.join(', ')}`);
  }

  // Priority validation
  if (priority && !VALID_PRIORITIES.includes(priority.toLowerCase())) {
    errors.push(`Invalid priority level. Allowed values: ${VALID_PRIORITIES.join(', ')}`);
  }

  // Target audience validation
  const audience = targetAudience ? targetAudience.toLowerCase() : 'all';
  if (!VALID_AUDIENCES.includes(audience)) {
    errors.push(`Invalid target audience. Allowed values: ${VALID_AUDIENCES.join(', ')}`);
  }

  // Specific user validation
  if (audience === 'specific_users') {
    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      errors.push('At least one target user must be specified when targetAudience is "specific_users".');
    } else {
      const invalidIds = targetUserIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        errors.push('targetUserIds array contains invalid user ObjectIds.');
      }
    }
  }

  const now = new Date();

  // ScheduledAt date validation
  let parsedScheduledAt = null;
  if (scheduledAt) {
    parsedScheduledAt = new Date(scheduledAt);
    if (isNaN(parsedScheduledAt.getTime())) {
      errors.push('scheduledAt must be a valid date.');
    } else if (isPublished === false && parsedScheduledAt < new Date(now.getTime() - 60000)) {
      errors.push('scheduledAt date cannot be in the past when scheduling a notification.');
    }
  }

  // ExpiresAt date validation
  let parsedExpiresAt = null;
  if (expiresAt) {
    parsedExpiresAt = new Date(expiresAt);
    if (isNaN(parsedExpiresAt.getTime())) {
      errors.push('expiresAt must be a valid date.');
    } else {
      const compareBaseline = parsedScheduledAt || now;
      if (parsedExpiresAt <= compareBaseline) {
        errors.push('expiresAt must be a date after scheduledAt / current date.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      title: title ? title.trim() : '',
      message: message ? message.trim() : '',
      type: type ? type.toLowerCase() : 'announcement',
      priority: priority ? priority.toLowerCase() : 'normal',
      targetAudience: audience,
      targetUserIds: Array.isArray(targetUserIds) ? targetUserIds : [],
      scheduledAt: parsedScheduledAt,
      expiresAt: parsedExpiresAt,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true
    }
  };
};

/**
 * Validate Notification Update Input
 */
const validateUpdateNotificationInput = (data) => {
  const errors = [];
  const { title, message, type, priority, targetAudience, targetUserIds, scheduledAt, expiresAt, isPublished } = data;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
      errors.push('Notification title must be between 3 and 200 characters.');
    }
  }

  if (message !== undefined) {
    if (typeof message !== 'string' || message.trim().length < 3) {
      errors.push('Notification message must be at least 3 characters long.');
    }
  }

  if (type !== undefined && !VALID_TYPES.includes(type.toLowerCase())) {
    errors.push(`Invalid notification type. Allowed values: ${VALID_TYPES.join(', ')}`);
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority.toLowerCase())) {
    errors.push(`Invalid priority level. Allowed values: ${VALID_PRIORITIES.join(', ')}`);
  }

  if (targetAudience !== undefined && !VALID_AUDIENCES.includes(targetAudience.toLowerCase())) {
    errors.push(`Invalid target audience. Allowed values: ${VALID_AUDIENCES.join(', ')}`);
  }

  if (targetUserIds !== undefined && Array.isArray(targetUserIds)) {
    const invalidIds = targetUserIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      errors.push('targetUserIds array contains invalid user ObjectIds.');
    }
  }

  const now = new Date();
  if (scheduledAt !== undefined && scheduledAt !== null) {
    const parsedScheduledAt = new Date(scheduledAt);
    if (isNaN(parsedScheduledAt.getTime())) {
      errors.push('scheduledAt must be a valid date.');
    } else if (isPublished === false && parsedScheduledAt < new Date(now.getTime() - 60000)) {
      errors.push('scheduledAt date cannot be in the past when scheduling.');
    }
  }

  if (expiresAt !== undefined && expiresAt !== null) {
    const parsedExpiresAt = new Date(expiresAt);
    if (isNaN(parsedExpiresAt.getTime())) {
      errors.push('expiresAt must be a valid date.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateCreateNotificationInput,
  validateUpdateNotificationInput
};
