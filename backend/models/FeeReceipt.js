const mongoose = require('mongoose');

const feeReceiptSchema = new mongoose.Schema(
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
    receiptNumber: {
      type: String,
      required: [true, 'Receipt number is required'],
      trim: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeePayment',
      required: [true, 'Payment ID is required']
    },
    studentFeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFee',
      required: [true, 'Student Fee ID is required']
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: [true, 'Student Profile ID is required']
    },
    amount: {
      type: Number,
      required: [true, 'Receipt amount is required'],
      min: 0.01
    },
    paymentMode: {
      type: String,
      required: [true, 'Payment mode is required']
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required']
    },
    feeDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Receipt number must be unique per institution
feeReceiptSchema.index({ institutionId: 1, receiptNumber: 1 }, { unique: true });
feeReceiptSchema.index({ studentId: 1, academicYearId: 1 });

module.exports = mongoose.model('FeeReceipt', feeReceiptSchema);
