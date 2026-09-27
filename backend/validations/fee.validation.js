const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateFeeStructureInput = (data) => {
  const errors = [];

  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Fee structure name is required.');
  }

  if (data.classId && !isValidObjectId(data.classId)) {
    errors.push('Provided classId is invalid.');
  }

  if (data.sectionId && !isValidObjectId(data.sectionId)) {
    errors.push('Provided sectionId is invalid.');
  }

  if (!Array.isArray(data.components) || data.components.length === 0) {
    errors.push('components array with at least one component is required.');
  } else {
    data.components.forEach((c, idx) => {
      if (!c.name || typeof c.name !== 'string' || c.name.trim() === '') {
        errors.push(`Component [${idx}] must have a name.`);
      }
      if (c.amount === undefined || isNaN(Number(c.amount)) || Number(c.amount) < 0) {
        errors.push(`Component [${idx}] amount must be a non-negative number.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateStudentFeeInput = (data) => {
  const errors = [];

  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }

  if (!data.studentId || !isValidObjectId(data.studentId)) {
    errors.push('Valid studentId is required.');
  }

  if (!data.classId || !isValidObjectId(data.classId)) {
    errors.push('Valid classId is required.');
  }

  if (!data.feeStructureId || !isValidObjectId(data.feeStructureId)) {
    errors.push('Valid feeStructureId is required.');
  }

  if (data.installments && Array.isArray(data.installments)) {
    data.installments.forEach((inst, idx) => {
      if (!inst.name || !inst.amount || !inst.dueDate) {
        errors.push(`Installment [${idx}] must have name, amount, and dueDate.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateBulkAssignInput = (data) => {
  const errors = [];

  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }

  if (!data.classId || !isValidObjectId(data.classId)) {
    errors.push('Valid classId is required.');
  }

  if (!data.feeStructureId || !isValidObjectId(data.feeStructureId)) {
    errors.push('Valid feeStructureId is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateCashPaymentInput = (data) => {
  const errors = [];

  if (!data.studentFeeId || !isValidObjectId(data.studentFeeId)) {
    errors.push('Valid studentFeeId is required.');
  }

  if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    errors.push('Payment amount must be greater than zero.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateOnlinePaymentInitiateInput = (data) => {
  const errors = [];

  if (!data.studentFeeId || !isValidObjectId(data.studentFeeId)) {
    errors.push('Valid studentFeeId is required.');
  }

  if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    errors.push('Payment amount must be greater than zero.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateOnlinePaymentVerifyInput = (data) => {
  const errors = [];

  if (!data.paymentId || !isValidObjectId(data.paymentId)) {
    errors.push('Valid paymentId is required.');
  }

  if (!data.orderId || typeof data.orderId !== 'string' || data.orderId.trim() === '') {
    errors.push('Valid orderId is required.');
  }

  if (!data.transactionId || typeof data.transactionId !== 'string' || data.transactionId.trim() === '') {
    errors.push('Valid transactionId is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateRefundInput = (data) => {
  const errors = [];

  if (!data.paymentId || !isValidObjectId(data.paymentId)) {
    errors.push('Valid paymentId is required.');
  }

  if (!data.refundAmount || isNaN(Number(data.refundAmount)) || Number(data.refundAmount) <= 0) {
    errors.push('Refund amount must be a positive number.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateDiscountInput = (data) => {
  const errors = [];

  if (!data.discountType && !data.type) {
    errors.push('type or discountType must be specified.');
  }

  const type = data.discountType || data.type;
  if (!['fixed', 'percentage'].includes(type)) {
    errors.push('discountType must be either "fixed" or "percentage".');
  }

  const val = data.discountValue !== undefined ? data.discountValue : data.value;
  if (val === undefined || isNaN(Number(val)) || Number(val) <= 0) {
    errors.push('discountValue / value must be a positive number.');
  }

  if (type === 'percentage' && Number(val) > 100) {
    errors.push('Percentage discount cannot exceed 100%.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  validateFeeStructureInput,
  validateStudentFeeInput,
  validateBulkAssignInput,
  validateCashPaymentInput,
  validateOnlinePaymentInitiateInput,
  validateOnlinePaymentVerifyInput,
  validateRefundInput,
  validateDiscountInput
};
