const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_EXAM_TYPES = [
  'unit_test',
  'class_test',
  'mid_term',
  'prelim',
  'semester_exam',
  'final_exam',
  'practical_exam',
  'internal_assessment',
  'other'
];

const VALID_STATUSES = ['draft', 'scheduled', 'ongoing', 'completed', 'published', 'archived'];

const validateCreateExamInput = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Examination name is required.');
  }

  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }

  if (data.examType && !VALID_EXAM_TYPES.includes(data.examType)) {
    errors.push(`examType must be one of: ${VALID_EXAM_TYPES.join(', ')}.`);
  }

  if (!data.startDate || isNaN(Date.parse(data.startDate))) {
    errors.push('Valid startDate is required.');
  }

  if (!data.endDate || isNaN(Date.parse(data.endDate))) {
    errors.push('Valid endDate is required.');
  }

  if (data.startDate && data.endDate && Date.parse(data.startDate) > Date.parse(data.endDate)) {
    errors.push('startDate cannot be after endDate.');
  }

  if (data.classes && !Array.isArray(data.classes)) {
    errors.push('classes must be an array of Class IDs.');
  } else if (Array.isArray(data.classes)) {
    data.classes.forEach((cId) => {
      if (!isValidObjectId(cId)) {
        errors.push(`Invalid classId in classes array: ${cId}`);
      }
    });
  }

  if (data.sections && !Array.isArray(data.sections)) {
    errors.push('sections must be an array of Section IDs.');
  } else if (Array.isArray(data.sections)) {
    data.sections.forEach((sId) => {
      if (!isValidObjectId(sId)) {
        errors.push(`Invalid sectionId in sections array: ${sId}`);
      }
    });
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUpdateExamInput = (data) => {
  const errors = [];

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
    errors.push('Examination name cannot be empty.');
  }

  if (data.academicYearId && !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }

  if (data.examType && !VALID_EXAM_TYPES.includes(data.examType)) {
    errors.push(`examType must be one of: ${VALID_EXAM_TYPES.join(', ')}.`);
  }

  if (data.startDate && isNaN(Date.parse(data.startDate))) {
    errors.push('Valid startDate is required.');
  }

  if (data.endDate && isNaN(Date.parse(data.endDate))) {
    errors.push('Valid endDate is required.');
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  VALID_EXAM_TYPES,
  VALID_STATUSES,
  validateCreateExamInput,
  validateUpdateExamInput
};
