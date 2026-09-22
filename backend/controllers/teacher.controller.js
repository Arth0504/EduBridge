const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateUserCreation, validateTeacherProfileInput } = require('../validations/userManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Get Teachers List
 * @route   GET /api/v1/teachers
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const getTeachers = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.status) {
      filter.status = req.query.status.toLowerCase();
    }

    const profiles = await TeacherProfile.find(filter)
      .populate('userId', 'fullName email phone isActive createdAt')
      .populate('institutionId', 'institutionName institutionCode')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Teachers retrieved successfully', {
      count: profiles.length,
      teachers: profiles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Teacher Details
 * @route   GET /api/v1/teachers/:id
 * @access  Private
 */
const getTeacherById = async (req, res, next) => {
  try {
    const profile = await TeacherProfile.findById(req.params.id)
      .populate('userId', 'fullName email phone isActive createdAt')
      .populate('institutionId', 'institutionName institutionCode');

    if (!profile) {
      return sendError(res, 404, 'Teacher profile not found.');
    }

    if (req.user.role === 'teacher') {
      if (profile.userId._id.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can view only your own teacher profile.');
      }
    } else if (req.user.role !== 'super_admin') {
      if (profile.institutionId._id.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access teachers outside your institution.');
      }
    }

    return sendSuccess(res, 200, 'Teacher profile retrieved', { teacher: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Teacher (User + TeacherProfile)
 * @route   POST /api/v1/teachers
 * @access  Private (Super Admin, Institution Admin)
 */
const createTeacher = async (req, res, next) => {
  try {
    const userVal = validateUserCreation({ ...req.body, role: 'teacher' });
    const profileVal = validateTeacherProfileInput(req.body);

    if (!userVal.isValid) return sendError(res, 400, userVal.errors.join(' '));
    if (!profileVal.isValid) return sendError(res, 400, profileVal.errors.join(' '));

    const { fullName, email, password, phone, employeeId } = req.body;

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId) {
      return sendError(res, 400, 'Institution ID is required.');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 400, `User with email '${email}' already exists.`);
    }

    const existingEmployeeId = await TeacherProfile.findOne({
      institutionId: targetInstitutionId,
      employeeId: employeeId.trim()
    });
    if (existingEmployeeId) {
      return sendError(res, 400, `Employee ID '${employeeId}' already exists in this institution.`);
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: 'teacher',
      institutionId: targetInstitutionId,
      isActive: true,
      isEmailVerified: true
    });

    const profile = await TeacherProfile.create({
      userId: user._id,
      institutionId: targetInstitutionId,
      employeeId: employeeId.trim(),
      qualification: req.body.qualification || '',
      specialization: req.body.specialization || '',
      designation: req.body.designation || 'Teacher',
      department: req.body.department || '',
      experience: req.body.experience || '',
      phone: phone || '',
      address: req.body.address || '',
      status: 'active'
    });

    await logAuditEvent({
      actor: req.user,
      action: 'TEACHER_CREATE',
      institutionId: targetInstitutionId,
      details: { employeeId: profile.employeeId, email: user.email },
      req
    });

    return sendSuccess(res, 201, 'Teacher created successfully.', {
      user: user.toSafeObject(),
      profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Teacher Profile
 * @route   PATCH /api/v1/teachers/:id
 * @access  Private (Super Admin, Institution Admin, Teacher Self)
 */
const updateTeacher = async (req, res, next) => {
  try {
    const profile = await TeacherProfile.findById(req.params.id);

    if (!profile) return sendError(res, 404, 'Teacher profile not found.');

    if (req.user.role === 'teacher') {
      if (profile.userId.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can update only your own teacher profile.');
      }
    } else if (req.user.role !== 'super_admin') {
      if (profile.institutionId.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update teachers outside your institution.');
      }
    }

    const allowedFields = ['qualification', 'specialization', 'designation', 'department', 'experience', 'phone', 'address'];
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) profile[f] = req.body[f];
    });

    await profile.save();

    return sendSuccess(res, 200, 'Teacher profile updated successfully.', { teacher: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Teacher Status
 * @route   PATCH /api/v1/teachers/:id/status
 * @access  Private (Super Admin, Institution Admin)
 */
const updateTeacherStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const profile = await TeacherProfile.findById(req.params.id);

    if (!profile) return sendError(res, 404, 'Teacher profile not found.');

    if (req.user.role !== 'super_admin') {
      if (profile.institutionId.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update teacher status for another institution.');
      }
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes((status || '').toLowerCase())) {
      return sendError(res, 400, `Invalid status. Allowed: ${validStatuses.join(', ')}.`);
    }

    profile.status = status.toLowerCase();
    await profile.save();

    await User.findByIdAndUpdate(profile.userId, { isActive: profile.status === 'active' });

    return sendSuccess(res, 200, `Teacher status updated to '${profile.status}'.`, { teacher: profile });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  updateTeacherStatus
};
