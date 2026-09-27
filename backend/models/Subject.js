const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    subjectType: {
      type: String,
      enum: ['core', 'elective', 'practical', 'language', 'other'],
      default: 'core'
    },
    credits: {
      type: Number,
      default: 0,
      min: [0, 'Credits cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// subjectCode must be unique within an institution
subjectSchema.index({ institutionId: 1, subjectCode: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
