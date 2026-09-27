const StudentFee = require('../models/StudentFee');
const FeeStructure = require('../models/FeeStructure');
const StudentProfile = require('../models/StudentProfile');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logAuditEvent } = require('../utils/auditLogger');
const { validateStudentFeeInput, isValidObjectId } = require('../validations/fee.validation');
const { recalculateStudentFee, getParentLinkedStudentProfileIds } = require('../services/fee.service');

/**
 * @desc    Assign Fee Structure to Student
 * @route   POST /api/v1/student-fees
 * @access  Private (Super Admin, Institution Admin)
 */
const assignStudentFee = async (req, res, next) => {
  try {
    const val = validateStudentFeeInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;
    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { academicYearId, studentId, classId, sectionId, feeStructureId, installments, lateFee } = req.body;

    // 1. Verify Student Profile belongs to institution
    const student = await StudentProfile.findById(studentId);
    if (!student) {
      return sendError(res, 404, 'Student profile not found.');
    }
    if (student.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Student belongs to a different institution.');
    }

    // 2. Verify Fee Structure belongs to institution & academic year
    const feeStruct = await FeeStructure.findById(feeStructureId);
    if (!feeStruct) {
      return sendError(res, 404, 'Fee structure not found.');
    }
    if (feeStruct.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Fee structure belongs to a different institution.');
    }

    // 3. Prevent duplicate assignment in same academic year
    const existing = await StudentFee.findOne({
      institutionId: targetInstitutionId,
      academicYearId,
      studentId,
      feeStructureId
    });
    if (existing) {
      return sendError(res, 400, 'Fee structure is already assigned to this student for the specified academic year.');
    }

    const totalAmount = feeStruct.totalAmount;
    const initialLateFee = Number(lateFee || 0);

    // Build default single installment if no installment array supplied
    let installmentDocs = [];
    if (Array.isArray(installments) && installments.length > 0) {
      installmentDocs = installments.map((inst, idx) => ({
        installmentNumber: inst.installmentNumber || idx + 1,
        name: inst.name || `Installment ${idx + 1}`,
        amount: Number(inst.amount),
        dueDate: new Date(inst.dueDate),
        paidAmount: 0,
        pendingAmount: Number(inst.amount),
        status: new Date(inst.dueDate) < new Date() ? 'overdue' : 'pending'
      }));
    } else {
      installmentDocs = [
        {
          installmentNumber: 1,
          name: 'Full Academic Year Fee',
          amount: totalAmount,
          dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          paidAmount: 0,
          pendingAmount: totalAmount,
          status: 'pending'
        }
      ];
    }

    const studentFeeDoc = new StudentFee({
      institutionId: targetInstitutionId,
      academicYearId,
      studentId,
      classId,
      sectionId: sectionId || null,
      feeStructureId,
      totalAmount,
      discountAmount: 0,
      lateFee: initialLateFee,
      paidAmount: 0,
      pendingAmount: totalAmount + initialLateFee,
      status: 'pending',
      installments: installmentDocs,
      discounts: [],
      createdBy: req.user._id
    });

    recalculateStudentFee(studentFeeDoc);
    await studentFeeDoc.save();

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'STUDENT_FEE_ASSIGNED',
      target: studentFeeDoc._id,
      details: { studentId, feeStructureId, totalAmount: studentFeeDoc.totalAmount }
    });

    return sendSuccess(res, 201, 'Student fee assigned successfully', {
      studentFee: studentFeeDoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Student Fees List with role-based & tenant isolation
 * @route   GET /api/v1/student-fees
 * @access  Private
 */
const getStudentFees = async (req, res, next) => {
  try {
    const filter = {};

    // Tenant Isolation
    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    // Role-based security checks
    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers are not authorized to access financial fee records.');
    }

    const { academicYearId, classId, sectionId, studentId, status, page = 1, limit = 50 } = req.query;

    if (academicYearId) filter.academicYearId = academicYearId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (status) filter.status = status;

    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: filter.institutionId });
      if (!myProfile) {
        return sendError(res, 403, 'Student profile not found.');
      }
      if (studentId && studentId !== myProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: Students can only view their own fee records.');
      }
      filter.studentId = myProfile._id;
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, filter.institutionId);
      if (linkedStudentIds.length === 0) {
        return sendSuccess(res, 200, 'Student fees retrieved', { count: 0, total: 0, page: 1, pages: 1, studentFees: [] });
      }
      if (studentId) {
        if (!linkedStudentIds.includes(studentId.toString())) {
          return sendError(res, 403, 'Forbidden: Parents can only view fees for linked children.');
        }
        filter.studentId = studentId;
      } else {
        filter.studentId = { $in: linkedStudentIds };
      }
    } else {
      if (studentId) filter.studentId = studentId;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const total = await StudentFee.countDocuments(filter);
    const fees = await StudentFee.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber profilePhoto',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('feeStructureId', 'name components totalAmount')
      .populate('academicYearId', 'name isCurrent status')
      .populate('classId', 'name className code')
      .populate('sectionId', 'name sectionName code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return sendSuccess(res, 200, 'Student fees retrieved successfully', {
      count: fees.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      studentFees: fees
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Student Fee by ID
 * @route   GET /api/v1/student-fees/:id
 * @access  Private
 */
const getStudentFeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Student Fee ID.');
    }

    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers are not authorized to access financial fee records.');
    }

    const fee = await StudentFee.findById(id)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber profilePhoto',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('feeStructureId')
      .populate('academicYearId', 'name isCurrent status')
      .populate('classId', 'name className code')
      .populate('sectionId', 'name sectionName code');

    if (!fee) {
      return sendError(res, 404, 'Student fee record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? fee.institutionId : req.user.institutionId;
    if (fee.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    // Role Security Enforcement
    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      if (!myProfile || fee.studentId._id.toString() !== myProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can only view your own fee record.');
      }
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, targetInstitutionId);
      if (!linkedStudentIds.includes(fee.studentId._id.toString())) {
        return sendError(res, 403, 'Forbidden: You can only view fees for linked children.');
      }
    }

    return sendSuccess(res, 200, 'Student fee details retrieved successfully', {
      studentFee: fee
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Student Fee (Add Late Fee / Adjust Installments)
 * @route   PATCH /api/v1/student-fees/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateStudentFeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Student Fee ID.');
    }

    const fee = await StudentFee.findById(id);
    if (!fee) {
      return sendError(res, 404, 'Student fee record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? fee.institutionId : req.user.institutionId;
    if (fee.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    const { lateFee, installments } = req.body;

    if (lateFee !== undefined && !isNaN(Number(lateFee))) {
      fee.lateFee = Math.max(0, Number(lateFee));
    }

    if (installments && Array.isArray(installments)) {
      fee.installments = installments;
    }

    fee.updatedBy = req.user._id;
    recalculateStudentFee(fee);
    await fee.save();

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'STUDENT_FEE_UPDATED',
      target: fee._id,
      details: { lateFee: fee.lateFee, pendingAmount: fee.pendingAmount }
    });

    return sendSuccess(res, 200, 'Student fee updated successfully', {
      studentFee: fee
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignStudentFee,
  getStudentFees,
  getStudentFeeById,
  updateStudentFeeById
};
