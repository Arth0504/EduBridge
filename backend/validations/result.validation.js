const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateResultPublishInput = (data) => {
  const errors = [];

  if (!data.examinationId || !isValidObjectId(data.examinationId)) {
    errors.push('Valid examinationId is required for result publication.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateResultQuery = (query) => {
  const errors = [];

  if (query.examinationId && !isValidObjectId(query.examinationId)) {
    errors.push('Invalid examinationId.');
  }
  if (query.classId && !isValidObjectId(query.classId)) {
    errors.push('Invalid classId.');
  }
  if (query.sectionId && !isValidObjectId(query.sectionId)) {
    errors.push('Invalid sectionId.');
  }
  if (query.studentId && !isValidObjectId(query.studentId)) {
    errors.push('Invalid studentId.');
  }
  if (query.academicYearId && !isValidObjectId(query.academicYearId)) {
    errors.push('Invalid academicYearId.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  validateResultPublishInput,
  validateResultQuery
};
