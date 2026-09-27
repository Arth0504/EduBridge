const Notification = require('../models/Notification');
const NotificationRead = require('../models/NotificationRead');
const User = require('../models/User');

/**
 * Reusable core helper to create a notification (usable by future modules like Attendance, Exams, Fees, etc.)
 */
const createNotification = async (notificationData) => {
  const {
    title,
    message,
    type = 'announcement',
    priority = 'normal',
    senderId,
    senderRole,
    institutionId,
    targetAudience = 'all',
    targetUserIds = [],
    attachments = [],
    scheduledAt = null,
    expiresAt = null,
    isPublished = true
  } = notificationData;

  const now = new Date();

  // If scheduledAt is provided in future and isPublished is false, set publishedAt null
  // If isPublished is true, publishedAt is now
  let publishedAt = null;
  let finalIsPublished = isPublished;

  if (scheduledAt && new Date(scheduledAt) > now && !isPublished) {
    finalIsPublished = false;
    publishedAt = null;
  } else if (finalIsPublished) {
    publishedAt = now;
  }

  const notification = await Notification.create({
    title,
    message,
    type,
    priority,
    senderId,
    senderRole,
    institutionId: institutionId || null,
    targetAudience,
    targetUserIds,
    attachments,
    scheduledAt,
    expiresAt,
    isPublished: finalIsPublished,
    publishedAt,
    isActive: true
  });

  return notification;
};

/**
 * Build query filter based on user role, tenant isolation, and parameters
 */
const buildUserNotificationQuery = (user, queryParams = {}) => {
  const now = new Date();
  const role = user.role.toLowerCase();
  const query = { isActive: true };

  // 1. Tenant Isolation
  if (role === 'super_admin') {
    if (queryParams.institutionId) {
      query.institutionId = queryParams.institutionId;
    }
  } else {
    // Non-super admin is locked strictly to their institution (or global super_admin notices)
    query.$or = [
      { institutionId: user.institutionId },
      { institutionId: null }
    ];
  }

  // 2. Role-based Audience Scoping
  if (role === 'student') {
    query.$and = [
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'students' },
          { targetAudience: 'specific_users', targetUserIds: user._id }
        ]
      }
    ];
  } else if (role === 'parent') {
    query.$and = [
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'parents' },
          { targetAudience: 'specific_users', targetUserIds: user._id }
        ]
      }
    ];
  } else if (role === 'teacher') {
    query.$and = [
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'teachers' },
          { targetAudience: 'specific_users', targetUserIds: user._id }
        ]
      }
    ];
  } else if (role === 'institution_admin' || role === 'super_admin') {
    // Admin filtering option (e.g. filter by targetAudience if requested)
    if (queryParams.targetAudience) {
      query.targetAudience = queryParams.targetAudience;
    }
  }

  // 3. Status, Publishing & Expiration Scoping
  if (role === 'student' || role === 'parent' || role === 'teacher' || queryParams.status === 'published') {
    // Regular users see ONLY published and non-expired notifications
    const publishCondition = {
      isPublished: true,
      $or: [
        { publishedAt: { $lte: now } },
        { scheduledAt: { $lte: now } }
      ]
    };

    const expiryCondition = {
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    };

    if (query.$and) {
      query.$and.push(publishCondition, expiryCondition);
    } else {
      query.$and = [publishCondition, expiryCondition];
    }
  } else if (queryParams.status === 'scheduled') {
    query.isPublished = false;
    query.scheduledAt = { $gt: now };
  } else if (queryParams.status === 'expired') {
    query.expiresAt = { $lte: now };
  }

  // 4. Optional Type & Priority filters
  if (queryParams.type) {
    query.type = queryParams.type.toLowerCase();
  }
  if (queryParams.priority) {
    query.priority = queryParams.priority.toLowerCase();
  }

  return query;
};

/**
 * Fetch visible notifications for user with pagination and read state
 */
const getNotificationsForUser = async (user, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const query = buildUserNotificationQuery(user, queryParams);

  // Fetch read records for this user
  const readRecords = await NotificationRead.find({ userId: user._id }).select('notificationId');
  const readIds = readRecords.map(r => r.notificationId.toString());
  const readSet = new Set(readIds);

  // If unread=true requested, exclude read notifications
  if (queryParams.unread === 'true' || queryParams.unread === true) {
    if (query.$and) {
      query.$and.push({ _id: { $nin: readIds } });
    } else {
      query.$and = [{ _id: { $nin: readIds } }];
    }
  }

  // Execute count and paginated query
  const totalCount = await Notification.countDocuments(query);
  const notifications = await Notification.find(query)
    .populate('senderId', 'fullName email role')
    .populate('institutionId', 'institutionName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Attach isRead flag
  const formatted = notifications.map(notif => ({
    ...notif,
    isRead: readSet.has(notif._id.toString())
  }));

  // Calculate total unread count for badge display
  const unreadCount = await getUnreadCountForUser(user);

  return {
    notifications: formatted,
    totalCount,
    unreadCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1
  };
};

/**
 * Get total unread notifications count for a user
 */
const getUnreadCountForUser = async (user) => {
  const query = buildUserNotificationQuery(user, { status: 'published' });

  // Get read notification IDs for this user
  const readRecords = await NotificationRead.find({ userId: user._id }).select('notificationId');
  const readIds = readRecords.map(r => r.notificationId.toString());

  if (query.$and) {
    query.$and.push({ _id: { $nin: readIds } });
  } else {
    query.$and = [{ _id: { $nin: readIds } }];
  }

  return await Notification.countDocuments(query);
};

/**
 * Mark a single notification as read for a user
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const readRecord = await NotificationRead.findOneAndUpdate(
    { notificationId, userId },
    { $setOnInsert: { notificationId, userId, readAt: new Date() } },
    { upsert: true, new: true }
  );
  return readRecord;
};

/**
 * Mark all currently visible unread notifications as read for a user
 */
const markAllNotificationsAsRead = async (user) => {
  const query = buildUserNotificationQuery(user, { status: 'published' });

  const visibleNotifications = await Notification.find(query).select('_id');
  const visibleIds = visibleNotifications.map(n => n._id);

  if (visibleIds.length === 0) {
    return { markedCount: 0 };
  }

  const existingRead = await NotificationRead.find({
    userId: user._id,
    notificationId: { $in: visibleIds }
  }).select('notificationId');

  const existingReadIds = new Set(existingRead.map(r => r.notificationId.toString()));
  const unreadIds = visibleIds.filter(id => !existingReadIds.has(id.toString()));

  if (unreadIds.length === 0) {
    return { markedCount: 0 };
  }

  const now = new Date();
  const docsToInsert = unreadIds.map(id => ({
    notificationId: id,
    userId: user._id,
    readAt: now
  }));

  await NotificationRead.insertMany(docsToInsert, { ordered: false });

  return { markedCount: unreadIds.length };
};

module.exports = {
  createNotification,
  buildUserNotificationQuery,
  getNotificationsForUser,
  getUnreadCountForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
