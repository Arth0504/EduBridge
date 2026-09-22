const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const ParentProfile = require('../models/ParentProfile');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateUserCreation } = require('../validations/userManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');
const logger = require('../utils/logger');

/**
 * @desc    Get Users (Super Admin: System-wide | Institution Admin: Own Institution)
 * @route   GET /api/v1/users
 * @access  Private (Super Admin, Institution Admin)
 */
const getUsers = async (req, res, next) => {
  try {
    const filter = {};

    // Tenant Isolation
    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) {
        filter.institutionId = req.query.institutionId;
      }
    } else {
      filter.institutionId = req.user.institutionId;
    }

    // Role filter
    if (req.query.role) {
      filter.role = req.query.role.toLowerCase();
    }

    // Status filter
    if (req.query.status) {
      if (req.query.status.toLowerCase() === 'active') {
        filter.isActive = true;
      } else if (['inactive', 'suspended'].includes(req.query.status.toLowerCase())) {
        filter.isActive = false;
      }
    }

    // Search query
    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('institutionId', 'institutionName institutionCode')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Users retrieved successfully', {
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single User by ID
 * @route   GET /api/v1/users/:id
 * @access  Private
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('institutionId', 'institutionName institutionCode');

    if (!user) {
      return sendError(res, 404, 'User not found.');
    }

    // Tenant isolation check
    if (req.user.role !== 'super_admin') {
      if (!req.user.institutionId || user.institutionId?._id?.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: You cannot access users outside your institution.');
      }
    }

    // Fetch linked profile based on role
    let profile = null;
    if (user.role === 'student') {
      profile = await StudentProfile.findOne({ userId: user._id });
    } else if (user.role === 'teacher') {
      profile = await TeacherProfile.findOne({ userId: user._id });
    } else if (user.role === 'parent') {
      profile = await ParentProfile.findOne({ userId: user._id });
    }

    return sendSuccess(res, 200, 'User details retrieved', {
      user,
      profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create User (Institution Admin provisioning)
 * @route   POST /api/v1/users
 * @access  Private (Super Admin, Institution Admin)
 */
const createUser = async (req, res, next) => {
  try {
    const { isValid, errors, sanitizedRole } = validateUserCreation(req.body);

    if (!isValid) {
      return sendError(res, 400, errors.join(' '));
    }

    const { fullName, email, password, phone } = req.body;

    // Determine target institutionId cleanly
    let targetInstitutionId;
    if (req.user.role === 'super_admin') {
      targetInstitutionId = req.body.institutionId || null;
    } else {
      targetInstitutionId = req.user.institutionId;
    }

    if (sanitizedRole !== 'super_admin' && !targetInstitutionId) {
      return sendError(res, 400, 'Institution ID is required for non-super admin users.');
    }

    // Duplicate check
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 400, `User with email '${email}' already exists.`);
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: sanitizedRole,
      institutionId: targetInstitutionId,
      isActive: true,
      isEmailVerified: true
    });

    await logAuditEvent({
      actor: req.user,
      action: 'USER_CREATE',
      institutionId: targetInstitutionId,
      details: { createdUserEmail: user.email, role: sanitizedRole },
      req
    });

    logger.info(`User created by ${req.user.email}: ${user.email} (${sanitizedRole})`);

    return sendSuccess(res, 201, `User '${user.fullName}' created successfully.`, {
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update User Basic Info
 * @route   PATCH /api/v1/users/:id
 * @access  Private (Super Admin, Institution Admin, Self)
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return sendError(res, 404, 'User not found.');
    }

    // Tenant check
    if (req.user.role !== 'super_admin') {
      if (req.user.role === 'institution_admin') {
        if (user.institutionId?.toString() !== req.user.institutionId.toString()) {
          return sendError(res, 403, 'Forbidden: Cannot update users outside your institution.');
        }
      } else if (req.user._id.toString() !== user._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can update only your own profile info.');
      }
    }

    const { fullName, phone } = req.body;
    if (fullName) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    await logAuditEvent({
      actor: req.user,
      action: 'USER_UPDATE',
      institutionId: user.institutionId,
      details: { updatedUserId: user._id },
      req
    });

    return sendSuccess(res, 200, 'User details updated successfully.', {
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update User Status (active / inactive / suspended)
 * @route   PATCH /api/v1/users/:id/status
 * @access  Private (Super Admin, Institution Admin)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return sendError(res, 404, 'User not found.');
    }

    if (user.role === 'super_admin') {
      return sendError(res, 403, 'System Rule Violation: Super Admin account status cannot be altered.');
    }

    // Tenant check
    if (req.user.role !== 'super_admin') {
      if (user.institutionId?.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update user status for another institution.');
      }
    }

    const normalizedStatus = (status || '').toLowerCase();
    if (!['active', 'inactive', 'suspended'].includes(normalizedStatus)) {
      return sendError(res, 400, "Invalid status. Allowed values: 'active', 'inactive', 'suspended'.");
    }

    user.isActive = normalizedStatus === 'active';
    await user.save();

    // Also update associated profiles if exist
    if (user.role === 'student') {
      await StudentProfile.findOneAndUpdate({ userId: user._id }, { status: normalizedStatus });
    } else if (user.role === 'teacher') {
      await TeacherProfile.findOneAndUpdate({ userId: user._id }, { status: normalizedStatus });
    }

    await logAuditEvent({
      actor: req.user,
      action: 'USER_STATUS_CHANGE',
      institutionId: user.institutionId,
      details: { targetUserId: user._id, newStatus: normalizedStatus },
      req
    });

    return sendSuccess(res, 200, `User status updated to '${normalizedStatus}'.`, {
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft Delete / Deactivate User
 * @route   DELETE /api/v1/users/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return sendError(res, 404, 'User not found.');
    }

    if (user.role === 'super_admin') {
      return sendError(res, 403, 'System Rule Violation: Super Admin cannot be deleted.');
    }

    if (req.user.role !== 'super_admin') {
      if (user.institutionId?.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot delete users outside your institution.');
      }
    }

    user.isActive = false;
    await user.save();

    return sendSuccess(res, 200, `User '${user.fullName}' deactivated successfully.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser
};
