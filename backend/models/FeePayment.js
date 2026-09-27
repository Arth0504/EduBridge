const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema(
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
    installmentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    paymentNumber: {
      type: String,
      required: [true, 'Payment number is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than zero']
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'online', 'bank_transfer', 'cheque'],
      required: [true, 'Payment mode is required']
    },
    status: {
      type: String,
      enum: ['pending', 'initiated', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'pending'
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    paymentProvider: {
      type: String,
      trim: true,
      default: null // e.g. 'razorpay', 'stripe'
    },
    orderId: {
      type: String,
      trim: true,
      default: null
    },
    transactionId: {
      type: String,
      trim: true,
      default: null
    },
    receiptNumber: {
      type: String,
      trim: true,
      default: null
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paidAt: {
      type: Date,
      default: null
    },
    failureReason: {
      type: String,
      trim: true,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

// Payment number must be unique within institution
feePaymentSchema.index({ institutionId: 1, paymentNumber: 1 }, { unique: true });
feePaymentSchema.index({ studentId: 1, academicYearId: 1 });
feePaymentSchema.index({ studentFeeId: 1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
