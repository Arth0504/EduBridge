const FeeReceipt = require('../models/FeeReceipt');
const StudentProfile = require('../models/StudentProfile');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { isValidObjectId } = require('../validations/fee.validation');
const { getParentLinkedStudentProfileIds } = require('../services/fee.service');

/**
 * @desc    Get Fee Receipts List
 * @route   GET /api/v1/fee-receipts
 * @access  Private
 */
const getFeeReceipts = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers are not authorized to access financial receipt records.');
    }

    const { academicYearId, studentId, receiptNumber } = req.query;

    if (academicYearId) filter.academicYearId = academicYearId;
    if (receiptNumber) filter.receiptNumber = { $regex: receiptNumber, $options: 'i' };

    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: filter.institutionId });
      if (!myProfile) return sendError(res, 403, 'Student profile not found.');
      if (studentId && studentId !== myProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: Students can only view their own receipts.');
      }
      filter.studentId = myProfile._id;
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, filter.institutionId);
      if (linkedStudentIds.length === 0) {
        return sendSuccess(res, 200, 'Fee receipts retrieved', { count: 0, receipts: [] });
      }
      if (studentId) {
        if (!linkedStudentIds.includes(studentId.toString())) {
          return sendError(res, 403, 'Forbidden: Parents can only view receipts for linked children.');
        }
        filter.studentId = studentId;
      } else {
        filter.studentId = { $in: linkedStudentIds };
      }
    } else {
      if (studentId) filter.studentId = studentId;
    }

    const receipts = await FeeReceipt.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('paymentId', 'paymentNumber paymentMode amount status transactionId orderId')
      .populate('issuedBy', 'fullName email')
      .populate('academicYearId', 'name')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Fee receipts retrieved successfully', {
      count: receipts.length,
      receipts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Fee Receipt by ID
 * @route   GET /api/v1/fee-receipts/:id
 * @access  Private
 */
const getFeeReceiptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Fee Receipt ID.');
    }

    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers are not authorized to access financial receipt records.');
    }

    const receipt = await FeeReceipt.findById(id)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('paymentId')
      .populate('studentFeeId')
      .populate('issuedBy', 'fullName email')
      .populate('academicYearId', 'name');

    if (!receipt) {
      return sendError(res, 404, 'Fee receipt not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? receipt.institutionId : req.user.institutionId;
    if (receipt.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      if (!myProfile || receipt.studentId._id.toString() !== myProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can only view your own receipts.');
      }
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, targetInstitutionId);
      if (!linkedStudentIds.includes(receipt.studentId._id.toString())) {
        return sendError(res, 403, 'Forbidden: You can only view receipts for linked children.');
      }
    }

    return sendSuccess(res, 200, 'Fee receipt details retrieved successfully', {
      receipt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeeReceipts,
  getFeeReceiptById
};
