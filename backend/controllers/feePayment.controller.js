const FeePayment = require('../models/FeePayment');
const StudentFee = require('../models/StudentFee');
const FeeReceipt = require('../models/FeeReceipt');
const StudentProfile = require('../models/StudentProfile');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logAuditEvent } = require('../utils/auditLogger');
const {
  validateCashPaymentInput,
  validateOnlinePaymentInitiateInput,
  isValidObjectId
} = require('../validations/fee.validation');
const {
  recalculateStudentFee,
  generatePaymentNumber,
  generateReceiptNumber,
  getParentLinkedStudentProfileIds
} = require('../services/fee.service');

/**
 * @desc    Record Cash Fee Payment
 * @route   POST /api/v1/fee-payments/cash
 * @access  Private (Super Admin, Institution Admin)
 */
const recordCashPayment = async (req, res, next) => {
  try {
    const val = validateCashPaymentInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const { studentFeeId, amount, installmentId, remarks } = req.body;
    const paymentAmount = Number(amount);

    // 1. Fetch Student Fee Record
    const studentFee = await StudentFee.findById(studentFeeId);
    if (!studentFee) {
      return sendError(res, 404, 'Student fee record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? studentFee.institutionId : req.user.institutionId;
    if (studentFee.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    // 2. Prevent Overpayment beyond outstanding pending fee
    if (paymentAmount > studentFee.pendingAmount) {
      return sendError(res, 400, `Payment amount (₹${paymentAmount}) exceeds current pending fee amount (₹${studentFee.pendingAmount}).`);
    }

    // 3. Generate unique numbers
    const paymentNumber = await generatePaymentNumber(targetInstitutionId);
    const receiptNumber = await generateReceiptNumber(targetInstitutionId);

    // 4. Update Student Fee Paid Amount & Status
    studentFee.paidAmount += paymentAmount;
    studentFee.updatedBy = req.user._id;
    recalculateStudentFee(studentFee);
    await studentFee.save();

    // 5. Create Fee Payment Record
    const payment = await FeePayment.create({
      institutionId: targetInstitutionId,
      academicYearId: studentFee.academicYearId,
      studentFeeId: studentFee._id,
      studentId: studentFee.studentId,
      installmentId: installmentId || null,
      paymentNumber,
      amount: paymentAmount,
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      paymentMode: 'cash',
      status: 'paid',
      collectedBy: req.user._id,
      receiptNumber,
      remarks: remarks || 'Cash payment collected at institution counter',
      createdBy: req.user._id,
      paidAt: new Date()
    });

    // 6. Create Fee Receipt Record
    const receipt = await FeeReceipt.create({
      institutionId: targetInstitutionId,
      academicYearId: studentFee.academicYearId,
      receiptNumber,
      paymentId: payment._id,
      studentFeeId: studentFee._id,
      studentId: studentFee.studentId,
      amount: paymentAmount,
      paymentMode: 'cash',
      paymentDate: payment.paymentDate,
      feeDetails: {
        totalAmount: studentFee.totalAmount,
        discountAmount: studentFee.discountAmount,
        lateFee: studentFee.lateFee,
        paidAmount: studentFee.paidAmount,
        pendingAmount: studentFee.pendingAmount
      },
      issuedBy: req.user._id
    });

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'CASH_PAYMENT_RECORDED',
      target: payment._id,
      details: { receiptNumber, amount: paymentAmount, studentId: studentFee.studentId }
    });

    return sendSuccess(res, 201, 'Cash payment recorded and receipt generated successfully', {
      payment,
      receipt,
      studentFee
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate Online Payment (Order abstraction ready for gateway provider integration)
 * @route   POST /api/v1/fee-payments/online/initiate
 * @access  Private (Super Admin, Institution Admin, Student, Parent)
 */
const initiateOnlinePayment = async (req, res, next) => {
  try {
    const val = validateOnlinePaymentInitiateInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers cannot initiate fee payments.');
    }

    const { studentFeeId, amount, installmentId, paymentProvider = 'razorpay' } = req.body;
    const paymentAmount = Number(amount);

    const studentFee = await StudentFee.findById(studentFeeId);
    if (!studentFee) {
      return sendError(res, 404, 'Student fee record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? studentFee.institutionId : req.user.institutionId;
    if (studentFee.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    // Role Security Check
    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      if (!myProfile || studentFee.studentId.toString() !== myProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can only initiate payments for your own fee record.');
      }
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, targetInstitutionId);
      if (!linkedStudentIds.includes(studentFee.studentId.toString())) {
        return sendError(res, 403, 'Forbidden: You can only initiate payments for linked children.');
      }
    }

    if (paymentAmount > studentFee.pendingAmount) {
      return sendError(res, 400, `Payment amount (₹${paymentAmount}) exceeds current pending fee amount (₹${studentFee.pendingAmount}).`);
    }

    const paymentNumber = await generatePaymentNumber(targetInstitutionId);
    const mockOrderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payment = await FeePayment.create({
      institutionId: targetInstitutionId,
      academicYearId: studentFee.academicYearId,
      studentFeeId: studentFee._id,
      studentId: studentFee.studentId,
      installmentId: installmentId || null,
      paymentNumber,
      amount: paymentAmount,
      paymentMode: 'online',
      status: 'initiated', // Explicitly NOT 'paid'
      paymentProvider,
      orderId: mockOrderId,
      createdBy: req.user._id,
      metadata: {
        initiatedByRole: req.user.role,
        note: 'Online order created. Integration with gateway provider required for live payment capture.'
      }
    });

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'ONLINE_PAYMENT_INITIATED',
      target: payment._id,
      details: { orderId: mockOrderId, amount: paymentAmount, provider: paymentProvider }
    });

    return sendSuccess(res, 201, 'Online payment order initiated successfully', {
      paymentOrder: {
        paymentId: payment._id,
        paymentNumber: payment.paymentNumber,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: 'INR',
        paymentProvider: payment.paymentProvider,
        status: payment.status,
        notice: 'Live gateway execution requires provider API key configuration. Client cannot force fake successful payment status.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Fee Payments History
 * @route   GET /api/v1/fee-payments
 * @access  Private
 */
const getFeePayments = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers are not authorized to access financial fee records.');
    }

    const { academicYearId, studentFeeId, studentId, paymentMode, status } = req.query;

    if (academicYearId) filter.academicYearId = academicYearId;
    if (studentFeeId) filter.studentFeeId = studentFeeId;
    if (paymentMode) filter.paymentMode = paymentMode;
    if (status) filter.status = status;

    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: filter.institutionId });
      if (!myProfile) return sendError(res, 403, 'Student profile not found.');
      if (studentId && studentId !== myProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: Students can only view their own payment history.');
      }
      filter.studentId = myProfile._id;
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, filter.institutionId);
      if (linkedStudentIds.length === 0) {
        return sendSuccess(res, 200, 'Payments retrieved', { count: 0, payments: [] });
      }
      if (studentId) {
        if (!linkedStudentIds.includes(studentId.toString())) {
          return sendError(res, 403, 'Forbidden: Parents can only view payments for linked children.');
        }
        filter.studentId = studentId;
      } else {
        filter.studentId = { $in: linkedStudentIds };
      }
    } else {
      if (studentId) filter.studentId = studentId;
    }

    const payments = await FeePayment.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('collectedBy', 'fullName email')
      .populate('academicYearId', 'name')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Payment history retrieved successfully', {
      count: payments.length,
      payments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Fee Payment by ID
 * @route   GET /api/v1/fee-payments/:id
 * @access  Private
 */
const getFeePaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Fee Payment ID.');
    }

    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers are not authorized to access financial fee records.');
    }

    const payment = await FeePayment.findById(id)
      .populate({
        path: 'studentId',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('collectedBy', 'fullName email')
      .populate('academicYearId', 'name');

    if (!payment) {
      return sendError(res, 404, 'Payment record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? payment.institutionId : req.user.institutionId;
    if (payment.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      if (!myProfile || payment.studentId._id.toString() !== myProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can only view your own payment records.');
      }
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, targetInstitutionId);
      if (!linkedStudentIds.includes(payment.studentId._id.toString())) {
        return sendError(res, 403, 'Forbidden: You can only view payments for linked children.');
      }
    }

    return sendSuccess(res, 200, 'Payment details retrieved successfully', {
      payment
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordCashPayment,
  initiateOnlinePayment,
  getFeePayments,
  getFeePaymentById
};
