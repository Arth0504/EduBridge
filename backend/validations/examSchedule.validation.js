const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateCreateExamScheduleInput = (data) => {
  const errors = [];

  if (!data.examinationId || !isValidObjectId(data.examinationId)) {
    errors.push('Valid examinationId is required.');
  }

  if (!data.classId || !isValidObjectId(data.classId)) {
    errors.push('Valid classId is required.');
  }

  if (!data.sectionId || !isValidObjectId(data.sectionId)) {
    errors.push('Valid sectionId is required.');
  }

  if (!data.subjectId || !isValidObjectId(data.subjectId)) {
    errors.push('Valid subjectId is required.');
  }

  if (!data.examDate || isNaN(Date.parse(data.examDate))) {
    errors.push('Valid examDate is required.');
  }

  if (data.maxMarks === undefined || data.maxMarks === null || typeof data.maxMarks !== 'number' || data.maxMarks <= 0) {
    errors.push('maxMarks must be a positive number greater than zero.');
  }

  if (data.passingMarks === undefined || data.passingMarks === null || typeof data.passingMarks !== 'number' || data.passingMarks < 0) {
    errors.push('passingMarks must be a non-negative number.');
  }

  if (typeof data.maxMarks === 'number' && typeof data.passingMarks === 'number' && data.passingMarks > data.maxMarks) {
    errors.push('passingMarks cannot be greater than maxMarks.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUpdateExamScheduleInput = (data) => {
  const errors = [];

  if (data.examDate && isNaN(Date.parse(data.examDate))) {
    errors.push('Valid examDate is required.');
  }

  if (data.maxMarks !== undefined && (typeof data.maxMarks !== 'number' || data.maxMarks <= 0)) {
    errors.push('maxMarks must be a positive number greater than zero.');
  }

  if (data.passingMarks !== undefined && (typeof data.passingMarks !== 'number' || data.passingMarks < 0)) {
    errors.push('passingMarks must be a non-negative number.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  validateCreateExamScheduleInput,
  validateUpdateExamScheduleInput
};
