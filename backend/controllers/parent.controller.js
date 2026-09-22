const User = require('../models/User');
const ParentProfile = require('../models/ParentProfile');
const ParentChildLink = require('../models/ParentChildLink');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateUserCreation } = require('../validations/userManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Get Parents List
 * @route   GET /api/v1/parents
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const getParents = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    const profiles = await ParentProfile.find(filter)
      .populate('userId', 'fullName email phone isActive createdAt')
      .populate('institutionId', 'institutionName institutionCode')
      .sort({ createdAt: -1 });

    // Attach linked children to each parent profile
    const parentsWithChildren = await Promise.all(
      profiles.map(async (profile) => {
        const links = await ParentChildLink.find({ parentId: profile.userId._id })
          .populate('studentId', 'fullName email phone isActive');
        return {
          ...profile.toObject(),
          children: links
        };
      })
    );

    return sendSuccess(res, 200, 'Parents retrieved successfully', {
      count: parentsWithChildren.length,
      parents: parentsWithChildren
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Parent Details with Linked Children
 * @route   GET /api/v1/parents/:id
 * @access  Private
 */
const getParentById = async (req, res, next) => {
  try {
    const profile = await ParentProfile.findById(req.params.id)
      .populate('userId', 'fullName email phone isActive createdAt')
      .populate('institutionId', 'institutionName institutionCode');

    if (!profile) {
      return sendError(res, 404, 'Parent profile not found.');
    }

    // Role-based Access Control logic
    if (req.user.role === 'parent') {
      if (profile.userId._id.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can view only your own parent profile.');
      }
    } else if (req.user.role !== 'super_admin') {
      if (profile.institutionId._id.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access parents outside your institution.');
      }
    }

    // Fetch linked children
    const links = await ParentChildLink.find({ parentId: profile.userId._id })
      .populate('studentId', 'fullName email phone isActive');

    return sendSuccess(res, 200, 'Parent profile retrieved', {
      parent: {
        ...profile.toObject(),
        children: links
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Parent (User + ParentProfile)
 * @route   POST /api/v1/parents
 * @access  Private (Super Admin, Institution Admin)
 */
const createParent = async (req, res, next) => {
  try {
    const userVal = validateUserCreation({ ...req.body, role: 'parent' });
    if (!userVal.isValid) return sendError(res, 400, userVal.errors.join(' '));

    const { fullName, email, password, phone } = req.body;
    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId) {
      return sendError(res, 400, 'Institution ID is required.');
    }

    // Duplicate email check
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 400, `User with email '${email}' already exists.`);
    }

    // Create User
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: 'parent',
      institutionId: targetInstitutionId,
      isActive: true,
      isEmailVerified: true
    });

    // Create ParentProfile
    const profile = await ParentProfile.create({
      userId: user._id,
      institutionId: targetInstitutionId,
      occupation: req.body.occupation || '',
      address: req.body.address || '',
      city: req.body.city || '',
      state: req.body.state || '',
      country: req.body.country || 'India',
      postalCode: req.body.postalCode || '',
      emergencyContact: req.body.emergencyContact || ''
    });

    await logAuditEvent({
      actor: req.user,
      action: 'PARENT_CREATE',
      institutionId: targetInstitutionId,
      details: { parentId: user._id, email: user.email },
      req
    });

    return sendSuccess(res, 201, 'Parent created successfully.', {
      user: user.toSafeObject(),
      profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Parent Profile
 * @route   PATCH /api/v1/parents/:id
 * @access  Private (Super Admin, Institution Admin, Parent Self)
 */
const updateParent = async (req, res, next) => {
  try {
    const profile = await ParentProfile.findById(req.params.id);

    if (!profile) {
      return sendError(res, 404, 'Parent profile not found.');
    }

    if (req.user.role === 'parent') {
      if (profile.userId.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can update only your own parent profile.');
      }
    } else if (req.user.role !== 'super_admin') {
      if (profile.institutionId.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update parents outside your institution.');
      }
    }

    const allowedFields = ['occupation', 'address', 'city', 'state', 'country', 'postalCode', 'emergencyContact', 'profilePhoto'];
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) profile[f] = req.body[f];
    });

    await profile.save();

    return sendSuccess(res, 200, 'Parent profile updated successfully.', { parent: profile });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getParents,
  getParentById,
  createParent,
  updateParent
};
