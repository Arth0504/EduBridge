const mongoose = require('mongoose');

const installmentSubSchema = new mongoose.Schema(
  {
    installmentNumber: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Installment amount cannot be negative']
    },
    dueDate: {
      type: Date,
      required: true
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'overdue', 'cancelled'],
      default: 'pending'
    }
  },
  { _id: true }
);

const discountSubSchema = new mongoose.Schema(
  {
    discountType: {
      type: String,
      enum: ['fixed', 'percentage'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const studentFeeSchema = new mongoose.Schema(
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
      required: [true, 'Student Profile ID is required']
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required']
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null
    },
    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: [true, 'Fee Structure ID is required']
    },
    originalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total fee amount is required'],
      min: 0
    },
    concessionAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    scholarshipAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    finalAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    lateFee: {
      type: Number,
      default: 0,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingAmount: {
      type: Number,
      required: true,
      min: 0
    },
    dueDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'overdue', 'cancelled'],
      default: 'pending'
    },
    installments: [installmentSubSchema],
    discounts: [discountSubSchema],
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

// Prevent duplicate assignment of the same fee structure to the same student in the same academic year
studentFeeSchema.index(
  { institutionId: 1, academicYearId: 1, studentId: 1, feeStructureId: 1 },
  { unique: true }
);

// Search indexes
studentFeeSchema.index({ institutionId: 1, academicYearId: 1, classId: 1, sectionId: 1 });
studentFeeSchema.index({ studentId: 1, academicYearId: 1 });

module.exports = mongoose.model('StudentFee', studentFeeSchema);

