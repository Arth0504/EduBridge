const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution ID is required']
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    },
    roomType: {
      type: String,
      enum: ['classroom', 'lab', 'auditorium', 'other'],
      default: 'classroom'
    },
    capacity: {
      type: Number,
      default: 40,
      min: [1, 'Capacity must be at least 1']
    },
    building: {
      type: String,
      trim: true,
      default: ''
    },
    floor: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Compound index for uniqueness per institution
roomSchema.index(
  { institutionId: 1, roomNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model('Room', roomSchema);
