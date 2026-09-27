const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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

  if (!data.teacherId || !isValidObjectId(data.teacherId)) {
    errors.push('Valid teacherId is required.');
  }

  if (data.subjectId && !isValidObjectId(data.subjectId)) {
    errors.push('Provided subjectId is invalid.');
  }

  if (!data.attendanceDate || isNaN(Date.parse(data.attendanceDate))) {
    errors.push('Valid attendanceDate is required.');
  }

  const validStatuses = ['present', 'absent', 'late', 'leave'];
  if (!data.status || !validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}.`);
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

  if (!data.teacherId || !isValidObjectId(data.teacherId)) {
    errors.push('Valid teacherId is required.');
  }

  if (data.subjectId && !isValidObjectId(data.subjectId)) {
    errors.push('Provided subjectId is invalid.');
  }

  if (!data.attendanceDate || isNaN(Date.parse(data.attendanceDate))) {
    errors.push('Valid attendanceDate is required.');
  }

  if (!Array.isArray(data.records) || data.records.length === 0) {
    errors.push('records array with at least one student attendance entry is required.');
  } else {
    const validStatuses = ['present', 'absent', 'late', 'leave'];
    data.records.forEach((rec, idx) => {
      if (!rec.studentId || !isValidObjectId(rec.studentId)) {
        errors.push(`Record [${idx}] has an invalid studentId.`);
      }
      if (!rec.status || !validStatuses.includes(rec.status)) {
        errors.push(`Record [${idx}] status must be one of: ${validStatuses.join(', ')}.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  isValidObjectId,
  validateSingleAttendanceInput,
  validateBulkAttendanceInput
};
