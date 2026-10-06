const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const validateCreateTimetableInput = (data) => {
  const errors = [];

  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
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

  if (!data.teacherId || !isValidObjectId(data.teacherId)) {
    errors.push('Valid teacherId is required.');
  }

  if (!data.dayOfWeek || !VALID_DAYS.includes(data.dayOfWeek)) {
    errors.push(`Valid dayOfWeek is required (${VALID_DAYS.join(', ')}).`);
  }

  if (data.periodNumber === undefined || data.periodNumber === null || typeof data.periodNumber !== 'number' || data.periodNumber < 1) {
    errors.push('periodNumber must be a positive integer >= 1.');
  }

  if (!data.startTime || typeof data.startTime !== 'string' || !data.startTime.trim()) {
    errors.push('Valid startTime string is required.');
  }

  if (!data.endTime || typeof data.endTime !== 'string' || !data.endTime.trim()) {
    errors.push('Valid endTime string is required.');
  }

  if (data.roomId && !isValidObjectId(data.roomId)) {
    errors.push('Invalid roomId provided.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUpdateTimetableInput = (data) => {
  const errors = [];

  if (data.dayOfWeek && !VALID_DAYS.includes(data.dayOfWeek)) {
    errors.push(`Valid dayOfWeek is required (${VALID_DAYS.join(', ')}).`);
  }

  if (data.periodNumber !== undefined && (typeof data.periodNumber !== 'number' || data.periodNumber < 1)) {
    errors.push('periodNumber must be a positive integer >= 1.');
  }

  if (data.academicYearId && !isValidObjectId(data.academicYearId)) {
    errors.push('Invalid academicYearId.');
  }

  if (data.classId && !isValidObjectId(data.classId)) {
    errors.push('Invalid classId.');
  }

  if (data.sectionId && !isValidObjectId(data.sectionId)) {
    errors.push('Invalid sectionId.');
  }

  if (data.subjectId && !isValidObjectId(data.subjectId)) {
    errors.push('Invalid subjectId.');
  }

  if (data.teacherId && !isValidObjectId(data.teacherId)) {
    errors.push('Invalid teacherId.');
  }

  if (data.roomId && !isValidObjectId(data.roomId)) {
    errors.push('Invalid roomId.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  VALID_DAYS,
  validateCreateTimetableInput,
  validateUpdateTimetableInput
};
