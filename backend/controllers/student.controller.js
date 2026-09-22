const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const ParentChildLink = require('../models/ParentChildLink');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateUserCreation, validateStudentProfileInput } = require('../validations/userManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Get Students List
 * @route   GET /api/v1/students
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const getStudents = async (req, res, next) => {
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

    const profiles = await StudentProfile.find(filter)
      .populate('userId', 'fullName email phone isActive createdAt')
      .populate('institutionId', 'institutionName institutionCode')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Students retrieved successfully', {
      count: profiles.length,
      students: profiles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Student Details
 * @route   GET /api/v1/students/:id
 * @access  Private
 */
const getStudentById = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findById(req.params.id)
      .populate('userId', 'fullName email phone isActive createdAt')
      .populate('institutionId', 'institutionName institutionCode');

    if (!profile) {
      return sendError(res, 404, 'Student profile not found.');
    }

    // Role-based Access Control logic
    if (req.user.role === 'student') {
      if (profile.userId._id.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can view only your own student profile.');
      }
    } else if (req.user.role === 'parent') {
      // Parent can view only linked children
      const isLinked = await ParentChildLink.findOne({
        parentId: req.user._id,
        studentId: profile.userId._id
      });
      if (!isLinked) {
        return sendError(res, 403, 'Forbidden: You can view only your explicitly linked children.');
      }
    } else if (req.user.role !== 'super_admin') {
      if (profile.institutionId._id.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access students outside your institution.');
      }
    }

    return sendSuccess(res, 200, 'Student profile retrieved', { student: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Student (User + StudentProfile)
 * @route   POST /api/v1/students
 * @access  Private (Super Admin, Institution Admin)
 */
const createStudent = async (req, res, next) => {
  try {
    const userVal = validateUserCreation({ ...req.body, role: 'student' });
    const profileVal = validateStudentProfileInput(req.body);

    if (!userVal.isValid) return sendError(res, 400, userVal.errors.join(' '));
    if (!profileVal.isValid) return sendError(res, 400, profileVal.errors.join(' '));

    const { fullName, email, password, phone, studentId } = req.body;

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId) {
      return sendError(res, 400, 'Institution ID is required.');
    }

    // Duplicate email check
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 400, `User with email '${email}' already exists.`);
    }

    // Unique Student ID check within institution
    const existingStudentId = await StudentProfile.findOne({
      institutionId: targetInstitutionId,
      studentId: studentId.trim()
    });
    if (existingStudentId) {
      return sendError(res, 400, `Student ID '${studentId}' already exists in this institution.`);
    }

    // Create User
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: 'student',
      institutionId: targetInstitutionId,
      isActive: true,
      isEmailVerified: true
    });

    // Create StudentProfile
    const profile = await StudentProfile.create({
      userId: user._id,
      institutionId: targetInstitutionId,
      studentId: studentId.trim(),
      dateOfBirth: req.body.dateOfBirth || null,
      gender: req.body.gender || '',
      bloodGroup: req.body.bloodGroup || '',
      address: req.body.address || '',
      city: req.body.city || '',
      state: req.body.state || '',
      postalCode: req.body.postalCode || '',
      classId: req.body.classId || '',
      sectionId: req.body.sectionId || '',
      rollNumber: req.body.rollNumber || '',
      emergencyContact: req.body.emergencyContact || '',
      status: 'active'
    });

    await logAuditEvent({
      actor: req.user,
      action: 'STUDENT_CREATE',
      institutionId: targetInstitutionId,
      details: { studentId: profile.studentId, email: user.email },
      req
    });

    return sendSuccess(res, 201, 'Student created successfully.', {
      user: user.toSafeObject(),
      profile
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Student Profile
 * @route   PATCH /api/v1/students/:id
 * @access  Private (Super Admin, Institution Admin, Student Self)
 */
const updateStudent = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findById(req.params.id);

    if (!profile) {
      return sendError(res, 404, 'Student profile not found.');
    }

    if (req.user.role === 'student') {
      if (profile.userId.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can update only your own student profile.');
      }
    } else if (req.user.role !== 'super_admin') {
      if (profile.institutionId.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update students outside your institution.');
      }
    }

    const allowedFields = ['dateOfBirth', 'gender', 'bloodGroup', 'address', 'city', 'state', 'postalCode', 'emergencyContact', 'classId', 'sectionId', 'rollNumber'];
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) profile[f] = req.body[f];
    });

    await profile.save();

    return sendSuccess(res, 200, 'Student profile updated successfully.', { student: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Student Status
 * @route   PATCH /api/v1/students/:id/status
 * @access  Private (Super Admin, Institution Admin)
 */
const updateStudentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const profile = await StudentProfile.findById(req.params.id);

    if (!profile) return sendError(res, 404, 'Student profile not found.');

    if (req.user.role !== 'super_admin') {
      if (profile.institutionId.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update student status for another institution.');
      }
    }

    const validStatuses = ['active', 'inactive', 'graduated', 'transferred', 'suspended'];
    if (!validStatuses.includes((status || '').toLowerCase())) {
      return sendError(res, 400, `Invalid status. Allowed: ${validStatuses.join(', ')}.`);
    }

    profile.status = status.toLowerCase();
    await profile.save();

    // Also update User isActive state
    await User.findByIdAndUpdate(profile.userId, { isActive: profile.status === 'active' });

    return sendSuccess(res, 200, `Student status updated to '${profile.status}'.`, { student: profile });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus
};
