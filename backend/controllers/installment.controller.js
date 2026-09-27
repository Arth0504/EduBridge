const StudentFee = require('../models/StudentFee');
const StudentProfile = require('../models/StudentProfile');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { getParentLinkedStudentProfileIds, recalculateStudentFee } = require('../services/fee.service');

/**
 * @desc    Get Installments List with status filtering
 * @route   GET /api/v1/installments
 * @access  Private
 */
const getInstallments = async (req, res, next) => {
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

    const { academicYearId, classId, sectionId, studentId, status } = req.query;
    if (academicYearId) filter.academicYearId = academicYearId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;

    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: filter.institutionId });
      if (!myProfile) return sendError(res, 403, 'Student profile not found.');
      filter.studentId = myProfile._id;
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, filter.institutionId);
      if (linkedStudentIds.length === 0) {
        return sendSuccess(res, 200, 'Installments retrieved', { count: 0, installments: [] });
      }
      filter.studentId = { $in: linkedStudentIds };
    } else if (studentId) {
      filter.studentId = studentId;
    }

    const studentFees = await StudentFee.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('academicYearId', 'name')
      .populate('classId', 'className code');

    const installmentsList = [];

    studentFees.forEach((sf) => {
      // Refresh status based on current date
      recalculateStudentFee(sf);
      if (Array.isArray(sf.installments)) {
        sf.installments.forEach((inst) => {
          if (!status || inst.status === status) {
            installmentsList.push({
              _id: inst._id,
              studentFeeId: sf._id,
              student: sf.studentId,
              academicYear: sf.academicYearId,
              class: sf.classId,
              installmentNumber: inst.installmentNumber,
              name: inst.name,
              amount: inst.amount,
              paidAmount: inst.paidAmount,
              pendingAmount: inst.pendingAmount,
              dueDate: inst.dueDate,
              status: inst.status
            });
          }
        });
      }
    });

    return sendSuccess(res, 200, 'Installments retrieved successfully', {
      count: installmentsList.length,
      installments: installmentsList
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInstallments
};
