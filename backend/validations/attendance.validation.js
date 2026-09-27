const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const VALID_STATUSES = ['present', 'absent', 'late', 'half_day', 'excused', 'leave'];

const isFutureDate = (dateStr) => {
  const inputDate = new Date(dateStr);
  inputDate.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);

  return inputDate > today;
};

const validateSingleAttendanceInput = (data) => {
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

  if (!data.studentId || !isValidObjectId(data.studentId)) {
    errors.push('Valid studentId is required.');
  }

  if (data.teacherId && !isValidObjectId(data.teacherId)) {
    errors.push('Provided teacherId is invalid.');
  }

  if (data.subjectId && !isValidObjectId(data.subjectId)) {
    errors.push('Provided subjectId is invalid.');
  }

  const dateVal = data.date || data.attendanceDate;
  if (!dateVal || isNaN(Date.parse(dateVal))) {
    errors.push('Valid attendance date is required.');
  } else if (isFutureDate(dateVal)) {
    errors.push('Attendance cannot be marked for future dates.');
  }

  if (!data.status || !VALID_STATUSES.includes(data.status)) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateBulkAttendanceInput = (data) => {
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

  if (data.teacherId && !isValidObjectId(data.teacherId)) {
    errors.push('Provided teacherId is invalid.');
  }

  if (data.subjectId && !isValidObjectId(data.subjectId)) {
    errors.push('Provided subjectId is invalid.');
  }

  const dateVal = data.date || data.attendanceDate;
  if (!dateVal || isNaN(Date.parse(dateVal))) {
    errors.push('Valid attendance date is required.');
  } else if (isFutureDate(dateVal)) {
    errors.push('Attendance cannot be marked for future dates.');
  }

  if (!Array.isArray(data.records) || data.records.length === 0) {
    errors.push('records array with at least one student attendance entry is required.');
  } else {
    data.records.forEach((rec, idx) => {
      if (!rec.studentId || !isValidObjectId(rec.studentId)) {
        errors.push(`Record [${idx}] has an invalid studentId.`);
      }
      if (!rec.status || !VALID_STATUSES.includes(rec.status)) {
        errors.push(`Record [${idx}] status must be one of: ${VALID_STATUSES.join(', ')}.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateAttendanceCorrectionInput = (data) => {
  const errors = [];

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  if (!data.correctionReason || typeof data.correctionReason !== 'string' || data.correctionReason.trim() === '') {
    errors.push('correctionReason is required when correcting/updating finalized attendance records.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  VALID_STATUSES,
  validateSingleAttendanceInput,
  validateBulkAttendanceInput,
  validateAttendanceCorrectionInput
};
