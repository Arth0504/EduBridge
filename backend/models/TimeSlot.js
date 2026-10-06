const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution ID is required']
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic Year ID is required']
    },
    periodNumber: {
      type: Number,
      required: [true, 'Period number is required'],
      min: [1, 'Period number must be at least 1']
    },
    periodName: {
      type: String,
      trim: true,
      default: ''
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['lecture', 'break', 'assembly', 'other'],
      default: 'lecture'
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

// Compound index for uniqueness per institution and academic year
timeSlotSchema.index(
  { institutionId: 1, academicYearId: 1, periodNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
