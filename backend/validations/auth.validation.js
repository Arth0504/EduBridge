/**
 * Input validation for authentication requests
 */
const validateRegisterInput = (data) => {
  const errors = [];
  const { fullName, email, password, role } = data;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    errors.push('Full name is required.');
  }

  if (!email || typeof email !== 'string' || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email.trim())) {
    errors.push('A valid email address is required.');
  }


  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  // Public registration scope restriction
  const requestedRole = (role || 'student').toLowerCase();
  const allowedPublicRoles = ['student', 'parent'];
  const restrictedRoles = ['super_admin', 'institution_admin', 'teacher'];

  if (restrictedRoles.includes(requestedRole)) {
    errors.push(`Public registration for role '${requestedRole}' is prohibited. Administrative and teaching accounts must be created by institution management.`);
  } else if (!allowedPublicRoles.includes(requestedRole)) {
    errors.push(`Invalid role '${requestedRole}'. Allowed public registration roles are: student, parent.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedRole: requestedRole
  };
};

const validateLoginInput = (data) => {
  const errors = [];
  const { email, password } = data;

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateChangePasswordInput = (data) => {
  const errors = [];
  const { currentPassword, newPassword } = data;

  if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.length === 0) {
    errors.push('Current password is required.');
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validateChangePasswordInput
};
