const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
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
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required']
    },
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be a positive number']
    },
    roomNumber: {
      type: String,
      trim: true,
      default: ''
    },
    classTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate section names under the same class + academic year
sectionSchema.index({ classId: 1, academicYearId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
