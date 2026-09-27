const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      minlength: [3, 'Message must be at least 3 characters long']
    },
    type: {
      type: String,
      enum: {
        values: ['announcement', 'notice', 'event', 'reminder', 'system'],
        message: '{VALUE} is not a valid notification type'
      },
      default: 'announcement'
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority level'
      },
      default: 'normal'
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required']
    },
    senderRole: {
      type: String,
      required: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: false // Null only for system-wide super_admin notifications
    },
    targetAudience: {
      type: String,
      enum: {
        values: ['all', 'students', 'teachers', 'parents', 'specific_users'],
        message: '{VALUE} is not a valid target audience'
      },
      default: 'all'
    },
    targetUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    attachments: [
      {
        fileName: { type: String, trim: true },
        fileUrl: { type: String, trim: true }
      }
    ],
    scheduledAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    publishedAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes for high-performance querying
notificationSchema.index({ institutionId: 1 });
notificationSchema.index({ targetAudience: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isPublished: 1 });
notificationSchema.index({ scheduledAt: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ isActive: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
