const StudentFee = require('../models/StudentFee');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logAuditEvent } = require('../utils/auditLogger');
const { validateDiscountInput, isValidObjectId } = require('../validations/fee.validation');
const { recalculateStudentFee } = require('../services/fee.service');

/**
 * @desc    Apply Fee Discount / Concession to Student Fee
 * @route   POST /api/v1/fee-discounts
 * @access  Private (Super Admin, Institution Admin)
 */
const applyDiscount = async (req, res, next) => {
  try {
    const val = validateDiscountInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const { studentFeeId, discountType, discountValue, reason } = req.body;

    if (!studentFeeId || !isValidObjectId(studentFeeId)) {
      return sendError(res, 400, 'Valid studentFeeId is required.');
    }

    const studentFee = await StudentFee.findById(studentFeeId);
    if (!studentFee) {
      return sendError(res, 404, 'Student fee record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? studentFee.institutionId : req.user.institutionId;
    if (studentFee.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    const valNum = Number(discountValue);
    let calcDiscountAmount = 0;

    if (discountType === 'percentage') {
      calcDiscountAmount = (valNum / 100) * studentFee.totalAmount;
    } else {
      calcDiscountAmount = valNum;
    }

    calcDiscountAmount = Number(calcDiscountAmount.toFixed(2));

    // Ensure discount does not exceed total amount or payable balance
    const currentDiscountSum = studentFee.discounts.reduce((s, d) => s + (d.discountAmount || 0), 0);
    const newTotalDiscount = currentDiscountSum + calcDiscountAmount;

    if (newTotalDiscount > studentFee.totalAmount) {
      return sendError(res, 400, `Total discount (₹${newTotalDiscount}) cannot exceed total fee amount (₹${studentFee.totalAmount}).`);
    }

    const discountEntry = {
      discountType,
      discountValue: valNum,
      discountAmount: calcDiscountAmount,
      reason: reason || 'Approved administrative concession',
      approvedBy: req.user._id,
      approvedAt: new Date()
    };

    studentFee.discounts.push(discountEntry);
    studentFee.updatedBy = req.user._id;

    recalculateStudentFee(studentFee);
    await studentFee.save();

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'FEE_DISCOUNT_APPLIED',
      target: studentFee._id,
      details: { discountType, discountValue: valNum, discountAmount: calcDiscountAmount, reason }
    });

    return sendSuccess(res, 200, 'Fee discount applied successfully', {
      studentFee
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyDiscount
};
