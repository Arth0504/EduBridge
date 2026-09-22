const mongoose = require('mongoose');

const parentChildLinkSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true
    },
    relationship: {
      type: String,
      enum: ['father', 'mother', 'guardian', 'other'],
      default: 'father'
    },
    isPrimaryContact: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Unique compound index preventing duplicate parent-child links
parentChildLinkSchema.index({ parentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('ParentChildLink', parentChildLinkSchema);
