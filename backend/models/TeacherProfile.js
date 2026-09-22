const mongoose = require('mongoose');

const teacherProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true
    },
    employeeId: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: '' },
    qualification: { type: String, default: '' },
    specialization: { type: String, default: '' },
    joiningDate: { type: Date, default: Date.now },
    designation: { type: String, default: 'Teacher' },
    department: { type: String, default: '' },
    experience: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    }
  },
  { timestamps: true }
);

// Ensure employeeId is unique per institution
teacherProfileSchema.index({ institutionId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('TeacherProfile', teacherProfileSchema);
