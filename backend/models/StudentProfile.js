const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
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
    studentId: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: ''
    },
    bloodGroup: {
      type: String,
      default: ''
    },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    postalCode: { type: String, default: '' },
    admissionDate: {
      type: Date,
      default: Date.now
    },
    classId: { type: String, default: '' },
    sectionId: { type: String, default: '' },
    rollNumber: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'graduated', 'transferred', 'suspended'],
      default: 'active'
    }
  },
  { timestamps: true }
);

// Ensure studentId is unique per institution
studentProfileSchema.index({ institutionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
