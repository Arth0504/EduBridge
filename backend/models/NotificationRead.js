const mongoose = require('mongoose');

const notificationReadSchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Prevent duplicate read records per notification & user combination
notificationReadSchema.index({ notificationId: 1, userId: 1 }, { unique: true });
notificationReadSchema.index({ userId: 1 });

module.exports = mongoose.model('NotificationRead', notificationReadSchema);
