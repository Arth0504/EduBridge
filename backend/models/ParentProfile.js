const mongoose = require('mongoose');

const parentProfileSchema = new mongoose.Schema(
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
    occupation: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    postalCode: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    profilePhoto: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ParentProfile', parentProfileSchema);
