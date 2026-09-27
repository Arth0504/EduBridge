const StudentFee = require('../models/StudentFee');
const Scholarship = require('../models/Scholarship');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logAuditEvent } = require('../utils/auditLogger');
const { validateDiscountInput, isValidObjectId } = require('../validations/fee.validation');
const { recalculateStudentFee } = require('../services/fee.service');

/**
 * @desc    Apply Fee Discount / Scholarship to Student Fee
 * @route   POST /api/v1/scholarships or POST /api/v1/fee-discounts
 * @access  Private (Super Admin, Institution Admin)
 */
const applyDiscount = async (req, res, next) => {
  try {
    const val = validateDiscountInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const { studentFeeId, discountType, type, discountValue, value, reason } = req.body;
    const finalType = discountType || type;
    const finalVal = Number(discountValue !== undefined ? discountValue : value);

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

    let calcDiscountAmount = 0;
    if (finalType === 'percentage') {
      calcDiscountAmount = (finalVal / 100) * studentFee.totalAmount;
    } else {
      calcDiscountAmount = finalVal;
    }

    calcDiscountAmount = Number(calcDiscountAmount.toFixed(2));

    // Ensure discount does not exceed total amount or payable balance
    const currentDiscountSum = studentFee.discounts.reduce((s, d) => s + (d.discountAmount || 0), 0);
    const newTotalDiscount = currentDiscountSum + calcDiscountAmount;

    if (newTotalDiscount > studentFee.totalAmount) {
      return sendError(res, 400, `Total discount/scholarship (₹${newTotalDiscount}) cannot exceed total fee amount (₹${studentFee.totalAmount}).`);
    }

    const discountEntry = {
      discountType: finalType,
      discountValue: finalVal,
      discountAmount: calcDiscountAmount,
      reason: reason || 'Approved administrative scholarship/concession',
      approvedBy: req.user._id,
      approvedAt: new Date()
    };

    studentFee.discounts.push(discountEntry);
    studentFee.updatedBy = req.user._id;

    recalculateStudentFee(studentFee);
    await studentFee.save();

    // Create standalone Scholarship record
    const scholarship = await Scholarship.create({
      institutionId: targetInstitutionId,
      academicYearId: studentFee.academicYearId,
      studentId: studentFee.studentId,
      studentFeeId: studentFee._id,
      type: finalType,
      value: finalVal,
      amount: calcDiscountAmount,
      reason: reason || 'Approved administrative concession',
      approvedBy: req.user._id,
      approvalDate: new Date()
    });

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'SCHOLARSHIP_CONCESSION_APPLIED',
      target: studentFee._id,
      details: { type: finalType, value: finalVal, amount: calcDiscountAmount, reason }
    });

    return sendSuccess(res, 201, 'Scholarship / concession applied successfully', {
      scholarship,
      studentFee
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Scholarships / Concessions List
 * @route   GET /api/v1/scholarships
 * @access  Private (Super Admin, Institution Admin)
 */
const getScholarships = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers cannot view financial concessions.');
    }

    const { academicYearId, studentId } = req.query;
    if (academicYearId) filter.academicYearId = academicYearId;
    if (studentId) filter.studentId = studentId;

    const list = await Scholarship.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('approvedBy', 'fullName email')
      .populate('academicYearId', 'name')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Scholarships retrieved successfully', {
      count: list.length,
      scholarships: list
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Scholarship / Concession by ID
 * @route   PATCH /api/v1/scholarships/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateScholarshipById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Scholarship ID.');
    }

    const scholarship = await Scholarship.findById(id);
    if (!scholarship) {
      return sendError(res, 404, 'Scholarship record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? scholarship.institutionId : req.user.institutionId;
    if (scholarship.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    const { reason } = req.body;
    if (reason !== undefined) scholarship.reason = reason;

    await scholarship.save();

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'SCHOLARSHIP_UPDATED',
      target: scholarship._id,
      details: { reason: scholarship.reason }
    });

    return sendSuccess(res, 200, 'Scholarship updated successfully', {
      scholarship
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyDiscount,
  getScholarships,
  updateScholarshipById
};
