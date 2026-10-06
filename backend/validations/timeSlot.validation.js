const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateTimeSlotInput = (data) => {
  const errors = [];

  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }

  if (data.periodNumber === undefined || data.periodNumber === null || typeof data.periodNumber !== 'number' || data.periodNumber < 1) {
    errors.push('periodNumber must be a positive integer >= 1.');
  }

  if (!data.startTime || typeof data.startTime !== 'string' || !data.startTime.trim()) {
    errors.push('Valid startTime is required.');
  }

  if (!data.endTime || typeof data.endTime !== 'string' || !data.endTime.trim()) {
    errors.push('Valid endTime is required.');
  }

  if (data.type && !['lecture', 'break', 'assembly', 'other'].includes(data.type)) {
    errors.push('Invalid time slot type.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  validateTimeSlotInput
};
