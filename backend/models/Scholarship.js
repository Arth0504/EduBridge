const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema(
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
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: [true, 'Student ID is required']
    },
    studentFeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFee',
      default: null
    },
    type: {
      type: String,
      enum: ['fixed', 'percentage'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: [0, 'Scholarship value cannot be negative']
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Scholarship amount cannot be negative']
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvalDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

scholarshipSchema.index({ institutionId: 1, academicYearId: 1, studentId: 1 });

module.exports = mongoose.model('Scholarship', scholarshipSchema);
