const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateRoomInput = (data) => {
  const errors = [];

  if (!data.roomNumber || typeof data.roomNumber !== 'string' || !data.roomNumber.trim()) {
    errors.push('Valid roomNumber is required.');
  }

  if (data.roomType && !['classroom', 'lab', 'auditorium', 'other'].includes(data.roomType)) {
    errors.push('Invalid roomType.');
  }

  if (data.capacity !== undefined && (typeof data.capacity !== 'number' || data.capacity < 1)) {
    errors.push('capacity must be a positive integer >= 1.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  validateRoomInput
};
