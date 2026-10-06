const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateSingleMarkInput = (data, scheduleMaxMarks = null) => {
  const errors = [];

  if (!data.examinationId || !isValidObjectId(data.examinationId)) {
    errors.push('Valid examinationId is required.');
  }

  if (!data.examScheduleId || !isValidObjectId(data.examScheduleId)) {
    errors.push('Valid examScheduleId is required.');
  }

  if (!data.studentId || !isValidObjectId(data.studentId)) {
    errors.push('Valid studentId is required.');
  }

  if (data.marksObtained === undefined || data.marksObtained === null || typeof data.marksObtained !== 'number') {
    errors.push('marksObtained is required and must be a number.');
  } else if (data.marksObtained < 0) {
    errors.push('marksObtained cannot be negative.');
  }

  const effectiveMaxMarks = scheduleMaxMarks !== null ? scheduleMaxMarks : data.maxMarks;
  if (effectiveMaxMarks !== undefined && data.marksObtained > effectiveMaxMarks) {
    errors.push(`marksObtained (${data.marksObtained}) cannot exceed maxMarks (${effectiveMaxMarks}).`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateBulkMarkInput = (data, scheduleMaxMarks = null) => {
  const errors = [];

  if (!data.examinationId || !isValidObjectId(data.examinationId)) {
    errors.push('Valid examinationId is required.');
  }

  if (!data.examScheduleId || !isValidObjectId(data.examScheduleId)) {
    errors.push('Valid examScheduleId is required.');
  }

  if (!Array.isArray(data.marks) || data.marks.length === 0) {
    errors.push('marks array with at least one student mark entry is required.');
  } else {
    data.marks.forEach((entry, idx) => {
      if (!entry.studentId || !isValidObjectId(entry.studentId)) {
        errors.push(`Marks entry [${idx}] has an invalid studentId.`);
      }
      if (entry.marksObtained === undefined || entry.marksObtained === null || typeof entry.marksObtained !== 'number') {
        errors.push(`Marks entry [${idx}] must have a numeric marksObtained.`);
      } else if (entry.marksObtained < 0) {
        errors.push(`Marks entry [${idx}] marksObtained cannot be negative.`);
      } else if (scheduleMaxMarks !== null && entry.marksObtained > scheduleMaxMarks) {
        errors.push(`Marks entry [${idx}] marksObtained (${entry.marksObtained}) exceeds maxMarks (${scheduleMaxMarks}).`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateMarkCorrectionInput = (data) => {
  const errors = [];

  if (data.marksObtained !== undefined) {
    if (typeof data.marksObtained !== 'number' || data.marksObtained < 0) {
      errors.push('marksObtained must be a non-negative number.');
    }
  }

  if (!data.correctionReason || typeof data.correctionReason !== 'string' || data.correctionReason.trim() === '') {
    errors.push('correctionReason is required when updating or correcting published exam marks.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  validateSingleMarkInput,
  validateBulkMarkInput,
  validateMarkCorrectionInput
};
