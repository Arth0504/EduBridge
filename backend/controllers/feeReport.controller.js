const StudentFee = require('../models/StudentFee');
const FeePayment = require('../models/FeePayment');
const StudentProfile = require('../models/StudentProfile');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { getParentLinkedStudentProfileIds } = require('../services/fee.service');

/**
 * @desc    Get Fee Summary Analytics & Reports
 * @route   GET /api/v1/fee-reports/summary
 * @access  Private
 */
const getFeeSummaryReport = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.user.role === 'teacher') {
      return sendError(res, 403, 'Forbidden: Teachers are not authorized to access financial fee reports.');
    }

    const { academicYearId, classId, sectionId } = req.query;

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
        return sendSuccess(res, 200, 'Fee summary report retrieved', {
          summary: {
            totalFees: 0,
            collectedAmount: 0,
            pendingAmount: 0,
            overdueAmount: 0,
            todaysCollection: 0,
            cashCollection: 0,
            onlineCollection: 0
          }
        });
      }
      filter.studentId = { $in: linkedStudentIds };
    }

    // 1. Query Student Fees matching filter
    const studentFees = await StudentFee.find(filter);

    let totalFees = 0;
    let collectedAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    studentFees.forEach((f) => {
      totalFees += (f.totalAmount + f.lateFee - f.discountAmount);
      collectedAmount += f.paidAmount;
      pendingAmount += f.pendingAmount;

      if (f.status === 'overdue' || (Array.isArray(f.installments) && f.installments.some((i) => i.status === 'overdue'))) {
        overdueAmount += f.pendingAmount;
      }
    });

    // 2. Query Payment Collections matching filter
    const payFilter = { ...filter, status: 'paid' };
    const payments = await FeePayment.find(payFilter);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let todaysCollection = 0;
    let cashCollection = 0;
    let onlineCollection = 0;

    payments.forEach((p) => {
      if (p.paymentMode === 'cash') cashCollection += p.amount;
      if (p.paymentMode === 'online') onlineCollection += p.amount;

      if (p.paymentDate && new Date(p.paymentDate) >= todayStart) {
        todaysCollection += p.amount;
      }
    });

    return sendSuccess(res, 200, 'Fee summary report retrieved successfully', {
      summary: {
        totalFees: Number(totalFees.toFixed(2)),
        collectedAmount: Number(collectedAmount.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
        overdueAmount: Number(overdueAmount.toFixed(2)),
        todaysCollection: Number(todaysCollection.toFixed(2)),
        cashCollection: Number(cashCollection.toFixed(2)),
        onlineCollection: Number(onlineCollection.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeeSummaryReport
};
