/**
 * Input validation for Phase 4 User & Profile Management
 */
const validateUserCreation = (data) => {
  const errors = [];
  const { fullName, email, password, role } = data;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    errors.push('Full name is required.');
  }

  if (!email || typeof email !== 'string' || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email.trim())) {
    errors.push('Valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  const requestedRole = (role || '').toLowerCase();
  const allowedRoles = ['teacher', 'student', 'parent', 'institution_admin'];

  if (requestedRole === 'super_admin') {
    errors.push("Prohibited: Creation of 'super_admin' role accounts via API is restricted.");
  } else if (!allowedRoles.includes(requestedRole)) {
    errors.push(`Invalid role '${role}'. Allowed roles are: ${allowedRoles.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedRole: requestedRole
  };
};

const validateStudentProfileInput = (data) => {
  const errors = [];
  const { studentId } = data;

  if (!studentId || typeof studentId !== 'string' || studentId.trim().length === 0) {
    errors.push('Student ID / Enrollment Number is required.');
  }

  return { isValid: errors.length === 0, errors };
};

const validateTeacherProfileInput = (data) => {
  const errors = [];
  const { employeeId } = data;

  if (!employeeId || typeof employeeId !== 'string' || employeeId.trim().length === 0) {
    errors.push('Employee ID is required.');
  }

  return { isValid: errors.length === 0, errors };
};

module.exports = {
  validateUserCreation,
  validateStudentProfileInput,
  validateTeacherProfileInput
};
