const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateAcademicYearInput = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Academic year name is required.');
  }
  if (!data.startDate || isNaN(Date.parse(data.startDate))) {
    errors.push('Valid start date is required.');
  }
  if (!data.endDate || isNaN(Date.parse(data.endDate))) {
    errors.push('Valid end date is required.');
  }
  if (data.startDate && data.endDate && Date.parse(data.startDate) >= Date.parse(data.endDate)) {
    errors.push('Start date must be before end date.');
  }
  if (data.status && !['upcoming', 'active', 'completed', 'archived'].includes(data.status)) {
    errors.push('Status must be one of: upcoming, active, completed, archived.');
  }
  return { isValid: errors.length === 0, errors };
};

const validateClassInput = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Class name is required.');
  }
  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }
  return { isValid: errors.length === 0, errors };
};

const validateSectionInput = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Section name is required.');
  }
  if (!data.classId || !isValidObjectId(data.classId)) {
    errors.push('Valid classId is required.');
  }
  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }
  if (data.capacity === undefined || data.capacity === null || Number(data.capacity) <= 0 || isNaN(Number(data.capacity))) {
    errors.push('Section capacity must be a positive number.');
  }
  if (data.classTeacherId && !isValidObjectId(data.classTeacherId)) {
    errors.push('Valid classTeacherId is required if provided.');
  }
  return { isValid: errors.length === 0, errors };
};

const validateSubjectInput = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Subject name is required.');
  }
  if (!data.subjectCode || typeof data.subjectCode !== 'string' || !data.subjectCode.trim()) {
    errors.push('Subject code is required.');
  }
  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) {
    errors.push('Valid academicYearId is required.');
  }
  if (data.subjectType && !['core', 'elective', 'practical', 'language', 'other'].includes(data.subjectType)) {
    errors.push('Subject type must be core, elective, practical, language, or other.');
  }
  return { isValid: errors.length === 0, errors };
};

const validateTeacherAssignmentInput = (data) => {
  const errors = [];
  if (!data.teacherId || !isValidObjectId(data.teacherId)) errors.push('Valid teacherId is required.');
  if (!data.subjectId || !isValidObjectId(data.subjectId)) errors.push('Valid subjectId is required.');
  if (!data.classId || !isValidObjectId(data.classId)) errors.push('Valid classId is required.');
  if (!data.sectionId || !isValidObjectId(data.sectionId)) errors.push('Valid sectionId is required.');
  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) errors.push('Valid academicYearId is required.');
  return { isValid: errors.length === 0, errors };
};

const validateStudentEnrollmentInput = (data) => {
  const errors = [];
  if (!data.studentId || !isValidObjectId(data.studentId)) errors.push('Valid studentId is required.');
  if (!data.classId || !isValidObjectId(data.classId)) errors.push('Valid classId is required.');
  if (!data.sectionId || !isValidObjectId(data.sectionId)) errors.push('Valid sectionId is required.');
  if (!data.academicYearId || !isValidObjectId(data.academicYearId)) errors.push('Valid academicYearId is required.');
  if (data.enrollmentStatus && !['active', 'promoted', 'transferred', 'withdrawn', 'completed'].includes(data.enrollmentStatus)) {
    errors.push('Invalid enrollment status.');
  }
  return { isValid: errors.length === 0, errors };
};

module.exports = {
  isValidObjectId,
  validateAcademicYearInput,
  validateClassInput,
  validateSectionInput,
  validateSubjectInput,
  validateTeacherAssignmentInput,
  validateStudentEnrollmentInput
};
