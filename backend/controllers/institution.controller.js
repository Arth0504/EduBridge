const Institution = require('../models/Institution');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const {
  validateInstitutionRegistration,
  validateRejectionReason
} = require('../validations/institution.validation');
const { logAuditEvent } = require('../utils/auditLogger');
const logger = require('../utils/logger');

/**
 * Generate unique uppercase Institution Code (e.g. EDU-84920)
 */
const generateUniqueCode = async () => {
  let code;
  let isUnique = false;

  while (!isUnique) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    code = `EDU-${randomNum}`;
    const existing = await Institution.findOne({ institutionCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

/**
 * @desc    Public Institution Registration Submission
 * @route   POST /api/v1/institutions/register
 * @access  Public
 */
const registerInstitution = async (req, res, next) => {
  try {
    const { isValid, errors, sanitizedType } = validateInstitutionRegistration(req.body);

    if (!isValid) {
      return sendError(res, 400, errors.join(' '));
    }

    const {
      institutionName,
      email,
      phone,
      website,
      address,
      city,
      state,
      country,
      postalCode,
      logo,
      description,
      establishedYear,
      proposedAdmin
    } = req.body;

    // Check duplicate institution email or existing pending registration
    const existingInstitution = await Institution.findOne({
      $or: [
        { email: email.toLowerCase() },
        { 'proposedAdmin.email': proposedAdmin.email.toLowerCase() }
      ]
    });

    if (existingInstitution) {
      return sendError(
        res,
        400,
        `An institution registration or user already exists with email '${email}' or proposed admin '${proposedAdmin.email}'.`
      );
    }

    const institutionCode = await generateUniqueCode();

    const institution = await Institution.create({
      institutionName,
      institutionCode,
      institutionType: sanitizedType,
      email: email.toLowerCase(),
      phone,
      website: website || '',
      address,
      city,
      state,
      country: country || 'India',
      postalCode,
      logo: logo || '',
      description: description || '',
      establishedYear: establishedYear ? Number(establishedYear) : null,
      registrationStatus: 'pending',
      isActive: false,
      proposedAdmin: {
        fullName: proposedAdmin.fullName,
        email: proposedAdmin.email.toLowerCase(),
        phone: proposedAdmin.phone || ''
      }
    });

    await logAuditEvent({
      action: 'INSTITUTION_REGISTER',
      institutionId: institution._id,
      details: {
        institutionName: institution.institutionName,
        proposedAdminEmail: proposedAdmin.email
      },
      req
    });

    logger.info(`New institution registration submitted: ${institution.institutionName} (${institution.institutionCode})`);

    return sendSuccess(res, 201, 'Institution registration request submitted successfully. Awaiting Super Admin review.', {
      institution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Super Admin: Get All Institutions (Supports status filter)
 * @route   GET /api/v1/institutions
 * @access  Private (Super Admin)
 */
const getAllInstitutions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status.toLowerCase())) {
      filter.registrationStatus = status.toLowerCase();
    }

    const institutions = await Institution.find(filter)
      .populate('approvedBy', 'fullName email role')
      .sort({ createdAt: -1 });

    const counts = {
      total: await Institution.countDocuments(),
      pending: await Institution.countDocuments({ registrationStatus: 'pending' }),
      approved: await Institution.countDocuments({ registrationStatus: 'approved' }),
      rejected: await Institution.countDocuments({ registrationStatus: 'rejected' }),
      suspended: await Institution.countDocuments({ registrationStatus: 'suspended' })
    };

    return sendSuccess(res, 200, 'Institutions retrieved successfully', {
      counts,
      institutions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Super Admin: Get Pending Institutions
 * @route   GET /api/v1/institutions/pending
 * @access  Private (Super Admin)
 */
const getPendingInstitutions = async (req, res, next) => {
  try {
    const pendingInstitutions = await Institution.find({ registrationStatus: 'pending' })
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Pending institution registration requests retrieved', {
      count: pendingInstitutions.length,
      institutions: pendingInstitutions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Super Admin: Get Single Institution Details
 * @route   GET /api/v1/institutions/:id
 * @access  Private (Super Admin)
 */
const getInstitutionById = async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.params.id)
      .populate('approvedBy', 'fullName email role');

    if (!institution) {
      return sendError(res, 404, 'Institution not found.');
    }

    // Find linked Institution Admin user if available
    const adminUser = await User.findOne({
      institutionId: institution._id,
      role: 'institution_admin'
    }).select('-password');

    return sendSuccess(res, 200, 'Institution details retrieved', {
      institution,
      linkedAdmin: adminUser || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Super Admin: Approve Institution & Provision Institution Admin
 * @route   PATCH /api/v1/institutions/:id/approve
 * @access  Private (Super Admin)
 */
const approveInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return sendError(res, 404, 'Institution not found.');
    }

    if (institution.registrationStatus === 'approved' && institution.isActive) {
      return sendSuccess(res, 200, 'Institution is already approved and active.', { institution });
    }

    // Update Status
    institution.registrationStatus = 'approved';
    institution.isActive = true;
    institution.approvedAt = new Date();
    institution.approvedBy = req.user._id;
    institution.rejectionReason = '';

    await institution.save();

    // Create or Link proposed Institution Admin account
    const adminEmail = institution.proposedAdmin.email.toLowerCase();
    let adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      const tempPassword = 'EduBridgeAdmin123!';
      adminUser = await User.create({
        fullName: institution.proposedAdmin.fullName,
        email: adminEmail,
        password: tempPassword,
        phone: institution.proposedAdmin.phone || '',
        role: 'institution_admin',
        institutionId: institution._id,
        isActive: true,
        isEmailVerified: true
      });
      logger.info(`Provisioned new Institution Admin account: ${adminUser.email}`);
    } else {
      // Update existing user role and institution link
      adminUser.role = 'institution_admin';
      adminUser.institutionId = institution._id;
      adminUser.isActive = true;
      await adminUser.save();
    }

    await logAuditEvent({
      actor: req.user,
      action: 'INSTITUTION_APPROVE',
      institutionId: institution._id,
      details: {
        institutionName: institution.institutionName,
        adminUserCreated: adminUser.email
      },
      req
    });

    return sendSuccess(res, 200, `Institution '${institution.institutionName}' approved successfully. Institution Admin provisioned.`, {
      institution,
      adminUser: adminUser.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Super Admin: Reject Institution Request
 * @route   PATCH /api/v1/institutions/:id/reject
 * @access  Private (Super Admin)
 */
const rejectInstitution = async (req, res, next) => {
  try {
    const { isValid, errors } = validateRejectionReason(req.body);

    if (!isValid) {
      return sendError(res, 400, errors.join(' '));
    }

    const { rejectionReason } = req.body;
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return sendError(res, 404, 'Institution not found.');
    }

    institution.registrationStatus = 'rejected';
    institution.isActive = false;
    institution.rejectionReason = rejectionReason;
    institution.approvedBy = req.user._id;
    institution.approvedAt = new Date();

    await institution.save();

    await logAuditEvent({
      actor: req.user,
      action: 'INSTITUTION_REJECT',
      institutionId: institution._id,
      details: {
        institutionName: institution.institutionName,
        rejectionReason
      },
      req
    });

    return sendSuccess(res, 200, `Institution '${institution.institutionName}' has been rejected.`, {
      institution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Super Admin: Suspend Institution
 * @route   PATCH /api/v1/institutions/:id/suspend
 * @access  Private (Super Admin)
 */
const suspendInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return sendError(res, 404, 'Institution not found.');
    }

    institution.registrationStatus = 'suspended';
    institution.isActive = false;

    await institution.save();

    await logAuditEvent({
      actor: req.user,
      action: 'INSTITUTION_SUSPEND',
      institutionId: institution._id,
      details: { institutionName: institution.institutionName },
      req
    });

    return sendSuccess(res, 200, `Institution '${institution.institutionName}' has been suspended.`, {
      institution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Super Admin: Reactivate Institution
 * @route   PATCH /api/v1/institutions/:id/reactivate
 * @access  Private (Super Admin)
 */
const reactivateInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return sendError(res, 404, 'Institution not found.');
    }

    institution.registrationStatus = 'approved';
    institution.isActive = true;

    await institution.save();

    await logAuditEvent({
      actor: req.user,
      action: 'INSTITUTION_REACTIVATE',
      institutionId: institution._id,
      details: { institutionName: institution.institutionName },
      req
    });

    return sendSuccess(res, 200, `Institution '${institution.institutionName}' has been reactivated.`, {
      institution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Institution Admin: Get My Institution Details
 * @route   GET /api/v1/institutions/my-institution
 * @access  Private (Institution Admin)
 */
const getMyInstitution = async (req, res, next) => {
  try {
    if (!req.user.institutionId) {
      return sendError(res, 400, 'Your user account is not associated with an institution.');
    }

    const institution = await Institution.findById(req.user.institutionId)
      .populate('approvedBy', 'fullName email');

    if (!institution) {
      return sendError(res, 404, 'Institution not found.');
    }

    return sendSuccess(res, 200, 'My institution details retrieved successfully', {
      institution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Institution Admin: Update Allowed Institution Profile Fields
 * @route   PATCH /api/v1/institutions/my-institution
 * @access  Private (Institution Admin)
 */
const updateMyInstitution = async (req, res, next) => {
  try {
    if (!req.user.institutionId) {
      return sendError(res, 400, 'Your user account is not associated with an institution.');
    }

    const institution = await Institution.findById(req.user.institutionId);

    if (!institution) {
      return sendError(res, 404, 'Institution not found.');
    }

    // Allowed updates only
    const allowedFields = [
      'phone',
      'website',
      'description',
      'address',
      'city',
      'state',
      'postalCode',
      'logo',
      'establishedYear'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        institution[field] = req.body[field];
      }
    });

    await institution.save();

    await logAuditEvent({
      actor: req.user,
      action: 'INSTITUTION_UPDATE_PROFILE',
      institutionId: institution._id,
      details: { updatedBy: req.user.email },
      req
    });

    return sendSuccess(res, 200, 'Institution details updated successfully.', {
      institution
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerInstitution,
  getAllInstitutions,
  getPendingInstitutions,
  getInstitutionById,
  approveInstitution,
  rejectInstitution,
  suspendInstitution,
  reactivateInstitution,
  getMyInstitution,
  updateMyInstitution
};
