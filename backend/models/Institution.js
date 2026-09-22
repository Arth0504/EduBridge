const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema(
  {
    institutionName: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true
    },
    institutionCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    institutionType: {
      type: String,
      enum: ['School', 'College', 'University', 'Coaching Institute', 'Other'],
      default: 'School'
    },
    email: {
      type: String,
      required: [true, 'Institution email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Institution phone is required'],
      trim: true
    },
    website: {
      type: String,
      default: '',
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      default: 'India',
      trim: true
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true
    },
    logo: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    establishedYear: {
      type: Number,
      default: null
    },
    registrationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending'
    },
    isActive: {
      type: Boolean,
      default: false
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    proposedAdmin: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, default: '', trim: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Institution', institutionSchema);
