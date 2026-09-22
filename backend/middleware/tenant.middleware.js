const Institution = require('../models/Institution');
const { sendError } = require('../utils/apiResponse');

/**
 * Middleware: Verify that non-SuperAdmin user belongs to an active, non-suspended institution
 */
const checkInstitutionActive = async (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, 'Authentication required.');
  }

  // Super Admin is never restricted by single institution status
  if (req.user.role === 'super_admin') {
    return next();
  }

  if (!req.user.institutionId) {
    return sendError(
      res,
      403,
      'Access Denied: Your user account is not associated with an onboarding institution.'
    );
  }

  try {
    const institution = await Institution.findById(req.user.institutionId);

    if (!institution) {
      return sendError(res, 404, 'Associated institution not found.');
    }

    if (institution.registrationStatus === 'suspended' || !institution.isActive) {
      return sendError(
        res,
        403,
        `Access Denied: Institution '${institution.institutionName}' is currently ${institution.registrationStatus} / inactive. Operations are suspended.`
      );
    }

    req.institution = institution;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkInstitutionActive };
