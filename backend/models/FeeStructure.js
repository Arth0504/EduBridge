const mongoose = require('mongoose');

const feeComponentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Fee component name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    amount: {
      type: Number,
      required: [true, 'Fee component amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    frequency: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'half_yearly', 'annual', 'custom'],
      default: 'annual'
    }
  },
  { _id: true }
);

const feeStructureSchema = new mongoose.Schema(
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
      default: null
    },
    name: {
      type: String,
      required: [true, 'Fee structure name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    components: {
      type: [feeComponentSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one fee component is required.'
      }
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
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

// Prevent duplicate fee structure names within the same institution and academic year
feeStructureSchema.index({ institutionId: 1, academicYearId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
