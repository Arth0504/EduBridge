const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const TeacherProfile = require('../models/TeacherProfile');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateTeacherAssignmentInput, isValidObjectId } = require('../validations/academicManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create Teacher-Subject Assignment
 * @route   POST /api/v1/teacher-assignments
 * @access  Private (Super Admin, Institution Admin)
 */
const createTeacherAssignment = async (req, res, next) => {
  try {
    const val = validateTeacherAssignmentInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { academicYearId, teacherId, subjectId, classId, sectionId } = req.body;

    // 1. Verify Teacher belongs to institution
    const teacher = await TeacherProfile.findById(teacherId);
    if (!teacher) {
      return sendError(res, 404, 'Teacher profile not found.');
    }
    if (teacher.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Teacher belongs to a different institution.');
    }

    // 2. Verify Subject belongs to institution
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return sendError(res, 404, 'Subject not found.');
    }
    if (subject.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Subject belongs to a different institution.');
    }

    // 3. Verify Class & Section belong to institution & match
    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return sendError(res, 404, 'Class not found.');
    }
    if (targetClass.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Class belongs to a different institution.');
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return sendError(res, 404, 'Section not found.');
    }
    if (section.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Section belongs to a different institution.');
    }
    if (section.classId.toString() !== classId.toString()) {
      return sendError(res, 400, 'Section does not belong to the specified class.');
    }

    // Duplicate check
    const existingAssignment = await TeacherSubjectAssignment.findOne({
      academicYearId,
      teacherId,
      subjectId,
      classId,
      sectionId
    });

    if (existingAssignment) {
      return sendError(res, 400, 'Teacher is already assigned to this subject, class, and section for this academic year.');
    }

    const assignment = await TeacherSubjectAssignment.create({
      institutionId: targetInstitutionId,
      academicYearId,
      teacherId,
      subjectId,
      classId,
      sectionId,
      isActive: true,
      assignedBy: req.user._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'TEACHER_ASSIGNMENT_CREATED',
      institutionId: targetInstitutionId,
      details: { assignmentId: assignment._id, teacherId, subjectId, classId, sectionId },
      req
    });

    return sendSuccess(res, 201, 'Teacher subject assignment created successfully.', { assignment });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Duplicate teacher-subject-class-section assignment.');
    }
    next(error);
  }
};

/**
 * @desc    Get Teacher Assignments List
 * @route   GET /api/v1/teacher-assignments
 * @access  Private
 */
const getTeacherAssignments = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else if (req.user.role === 'teacher') {
      // Find teacher profile for current user
      const teacherProfile = await TeacherProfile.findOne({ userId: req.user._id });
      if (!teacherProfile) {
        return sendSuccess(res, 200, 'No teacher profile found.', { count: 0, assignments: [] });
      }
      filter.teacherId = teacherProfile._id;
      filter.institutionId = req.user.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.teacherId) filter.teacherId = req.query.teacherId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const assignments = await TeacherSubjectAssignment.find(filter)
      .populate({
        path: 'teacherId',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('subjectId', 'name subjectCode subjectType credits')
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('academicYearId', 'name status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Teacher assignments retrieved successfully.', {
      count: assignments.length,
      assignments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Assignments for a Specific Teacher
 * @route   GET /api/v1/teacher-assignments/teacher/:teacherId
 * @access  Private
 */
const getAssignmentsByTeacherId = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.teacherId)) {
      return sendError(res, 400, 'Invalid Teacher ID.');
    }

    const teacher = await TeacherProfile.findById(req.params.teacherId);
    if (!teacher) {
      return sendError(res, 404, 'Teacher profile not found.');
    }

    // Role check
    if (req.user.role === 'teacher') {
      const myProfile = await TeacherProfile.findOne({ userId: req.user._id });
      if (!myProfile || myProfile._id.toString() !== req.params.teacherId) {
        return sendError(res, 403, 'Forbidden: You can view only your own teacher assignments.');
      }
    } else if (req.user.role !== 'super_admin') {
      if (teacher.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access teacher from another institution.');
      }
    }

    const assignments = await TeacherSubjectAssignment.find({ teacherId: req.params.teacherId })
      .populate('subjectId', 'name subjectCode subjectType credits')
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('academicYearId', 'name status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Teacher assignments retrieved.', {
      count: assignments.length,
      assignments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Teacher Assignment Status
 * @route   PATCH /api/v1/teacher-assignments/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateTeacherAssignment = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Assignment ID.');
    }

    const assignment = await TeacherSubjectAssignment.findById(req.params.id);
    if (!assignment) {
      return sendError(res, 404, 'Assignment not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (assignment.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update assignment belonging to another institution.');
      }
    }

    if (req.body.isActive !== undefined) {
      assignment.isActive = req.body.isActive;
    }

    await assignment.save();

    await logAuditEvent({
      actor: req.user,
      action: 'TEACHER_ASSIGNMENT_UPDATED',
      institutionId: assignment.institutionId,
      details: { assignmentId: assignment._id, isActive: assignment.isActive },
      req
    });

    return sendSuccess(res, 200, 'Teacher assignment updated.', { assignment });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove/Delete Teacher Assignment
 * @route   DELETE /api/v1/teacher-assignments/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const deleteTeacherAssignment = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Assignment ID.');
    }

    const assignment = await TeacherSubjectAssignment.findById(req.params.id);
    if (!assignment) {
      return sendError(res, 404, 'Assignment not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (assignment.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot delete assignment belonging to another institution.');
      }
    }

    await TeacherSubjectAssignment.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'TEACHER_ASSIGNMENT_REMOVED',
      institutionId: assignment.institutionId,
      details: { assignmentId: req.params.id },
      req
    });

    return sendSuccess(res, 200, 'Teacher assignment removed successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeacherAssignment,
  getTeacherAssignments,
  getAssignmentsByTeacherId,
  updateTeacherAssignment,
  deleteTeacherAssignment
};
