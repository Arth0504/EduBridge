/**
 * Input validation for Institution endpoints
 */
const validateInstitutionRegistration = (data) => {
  const errors = [];
  const {
    institutionName,
    institutionType,
    email,
    phone,
    address,
    city,
    state,
    postalCode,
    proposedAdmin
  } = data;

  if (!institutionName || typeof institutionName !== 'string' || institutionName.trim().length === 0) {
    errors.push('Institution name is required.');
  }

  if (!email || typeof email !== 'string' || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email.trim())) {
    errors.push('Valid institution email address is required.');
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    errors.push('Institution phone number is required.');
  }

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    errors.push('Street address is required.');
  }

  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    errors.push('City is required.');
  }

  if (!state || typeof state !== 'string' || state.trim().length === 0) {
    errors.push('State is required.');
  }

  if (!postalCode || typeof postalCode !== 'string' || postalCode.trim().length === 0) {
    errors.push('Postal code is required.');
  }

  if (!proposedAdmin || typeof proposedAdmin !== 'object') {
    errors.push('Proposed Institution Admin details are required.');
  } else {
    if (!proposedAdmin.fullName || proposedAdmin.fullName.trim().length === 0) {
      errors.push('Proposed admin full name is required.');
    }
    if (!proposedAdmin.email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(proposedAdmin.email.trim())) {
      errors.push('Valid proposed admin email address is required.');
    }
  }

  const validTypes = ['School', 'College', 'University', 'Coaching Institute', 'Other'];
  const sanitizedType = validTypes.includes(institutionType) ? institutionType : 'School';

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedType
  };
};

const validateRejectionReason = (data) => {
  const errors = [];
  const { rejectionReason } = data;

  if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
    errors.push('A valid rejection reason is required when rejecting an institution.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateInstitutionRegistration,
  validateRejectionReason
};
