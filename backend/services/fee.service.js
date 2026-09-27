const FeePayment = require('../models/FeePayment');
const FeeReceipt = require('../models/FeeReceipt');
const StudentProfile = require('../models/StudentProfile');
const ParentChildLink = require('../models/ParentChildLink');

/**
 * Calculates pending fee amount safely (prevents negative amounts).
 */
const calculatePendingAmount = (totalAmount = 0, discountAmount = 0, lateFee = 0, paidAmount = 0) => {
  const pending = Number(totalAmount) + Number(lateFee) - Number(discountAmount) - Number(paidAmount);
  return Math.max(0, Number(pending.toFixed(2)));
};

/**
 * Generates unique receipt number for an institution.
 */
const generateReceiptNumber = async (institutionId) => {
  const year = new Date().getFullYear();
  const count = await FeeReceipt.countDocuments({ institutionId });
  const seq = String(count + 1).padStart(6, '0');
  return `REC-${year}-${seq}`;
};

/**
 * Generates unique payment number for an institution.
 */
const generatePaymentNumber = async (institutionId) => {
  const year = new Date().getFullYear();
  const count = await FeePayment.countDocuments({ institutionId });
  const seq = String(count + 1).padStart(6, '0');
  return `PAY-${year}-${seq}`;
};

/**
 * Recalculates student fee totals, pending amounts, and status.
 */
const recalculateStudentFee = (studentFee) => {
  // Calculate total discount
  let totalDiscount = 0;
  if (Array.isArray(studentFee.discounts)) {
    studentFee.discounts.forEach((d) => {
      totalDiscount += Number(d.discountAmount || 0);
    });
  }
  studentFee.discountAmount = Number(totalDiscount.toFixed(2));

  // Calculate pending amount
  const pending = calculatePendingAmount(
    studentFee.totalAmount,
    studentFee.discountAmount,
    studentFee.lateFee,
    studentFee.paidAmount
  );
  studentFee.pendingAmount = pending;

  // Determine overall status
  if (pending === 0 && (studentFee.paidAmount > 0 || studentFee.totalAmount === 0)) {
    studentFee.status = 'paid';
  } else if (studentFee.paidAmount > 0) {
    studentFee.status = 'partially_paid';
  } else {
    studentFee.status = 'pending';
  }

  // Update installment statuses & allocations if installments exist
  if (Array.isArray(studentFee.installments) && studentFee.installments.length > 0) {
    let remainingPaidPool = studentFee.paidAmount;

    studentFee.installments.forEach((inst) => {
      // Effective installment target after proportional discount could be checked or simple sequential fill
      const instTarget = inst.amount;
      if (remainingPaidPool >= instTarget) {
        inst.paidAmount = instTarget;
        inst.pendingAmount = 0;
        inst.status = 'paid';
        remainingPaidPool -= instTarget;
      } else if (remainingPaidPool > 0) {
        inst.paidAmount = remainingPaidPool;
        inst.pendingAmount = Math.max(0, Number((instTarget - remainingPaidPool).toFixed(2)));
        inst.status = 'partially_paid';
        remainingPaidPool = 0;
      } else {
        inst.paidAmount = 0;
        inst.pendingAmount = instTarget;
        const isPastDue = inst.dueDate && new Date(inst.dueDate) < new Date();
        inst.status = isPastDue ? 'overdue' : 'pending';
      }
    });
  }

  return studentFee;
};

/**
 * Resolves StudentProfile IDs linked to a parent
 */
const getParentLinkedStudentProfileIds = async (parentUserId, institutionId) => {
  const links = await ParentChildLink.find({ parentId: parentUserId, institutionId });
  const studentUserIds = links.map((l) => l.studentId);
  const profiles = await StudentProfile.find({ userId: { $in: studentUserIds }, institutionId });
  return profiles.map((p) => p._id.toString());
};

module.exports = {
  calculatePendingAmount,
  generateReceiptNumber,
  generatePaymentNumber,
  recalculateStudentFee,
  getParentLinkedStudentProfileIds
};
