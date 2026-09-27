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
  const origAmount = Number(studentFee.originalAmount || studentFee.totalAmount || 0);
  studentFee.originalAmount = origAmount;

  // Calculate total discount
  let totalDiscount = 0;
  if (Array.isArray(studentFee.discounts)) {
    studentFee.discounts.forEach((d) => {
      totalDiscount += Number(d.discountAmount || 0);
    });
  }
  studentFee.discountAmount = Number(totalDiscount.toFixed(2));
  studentFee.concessionAmount = Number(totalDiscount.toFixed(2));

  const total = origAmount;
  studentFee.totalAmount = total;

  const finalAmt = Math.max(0, total + Number(studentFee.lateFee || 0) - studentFee.discountAmount);
  studentFee.finalAmount = Number(finalAmt.toFixed(2));

  // Calculate pending amount
  const pending = Math.max(0, Number((studentFee.finalAmount - Number(studentFee.paidAmount || 0)).toFixed(2)));
  studentFee.pendingAmount = pending;

  // Determine overall status
  if (studentFee.status !== 'cancelled') {
    if (pending === 0 && (studentFee.paidAmount > 0 || studentFee.finalAmount === 0)) {
      studentFee.status = 'paid';
    } else if (studentFee.paidAmount > 0) {
      studentFee.status = 'partially_paid';
    } else {
      studentFee.status = 'pending';
    }
  }

  // Update installment statuses & allocations if installments exist
  if (Array.isArray(studentFee.installments) && studentFee.installments.length > 0) {
    let remainingPaidPool = studentFee.paidAmount;

    studentFee.installments.forEach((inst) => {
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

    // If any installment is overdue and student overall is not fully paid, mark status overdue
    if (studentFee.status !== 'paid' && studentFee.status !== 'cancelled') {
      const hasOverdueInstallment = studentFee.installments.some((i) => i.status === 'overdue');
      if (hasOverdueInstallment) {
        studentFee.status = 'overdue';
      }
    }
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
