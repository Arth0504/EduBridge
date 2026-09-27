const StudentAcademicEnrollment = require('../models/StudentAcademicEnrollment');
const StudentProfile = require('../models/StudentProfile');
const Class = require('../models/Class');
const Section = require('../models/Section');
const ParentChildLink = require('../models/ParentChildLink');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateStudentEnrollmentInput, isValidObjectId } = require('../validations/academicManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create Student Academic Enrollment
 * @route   POST /api/v1/student-enrollments
 * @access  Private (Super Admin, Institution Admin)
 */
const createStudentEnrollment = async (req, res, next) => {
  try {
    const val = validateStudentEnrollmentInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { academicYearId, studentId, classId, sectionId, rollNumber, enrollmentStatus } = req.body;

    // 1. Verify student exists & belongs to institution
    const student = await StudentProfile.findById(studentId);
    if (!student) {
      return sendError(res, 404, 'Student profile not found.');
    }
    if (student.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Student belongs to a different institution.');
    }

    // 2. Verify class & section belong to institution & match
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

    const statusToUse = enrollmentStatus || 'active';

    // 3. Block multiple active enrollments for the same student in the same academic year
    if (statusToUse === 'active') {
      const existingActiveEnrollment = await StudentAcademicEnrollment.findOne({
        academicYearId,
        studentId,
        enrollmentStatus: 'active'
      });

      if (existingActiveEnrollment) {
        return sendError(res, 400, 'Student already has an active class/section enrollment for this academic year.');
      }
    }

    const enrollment = await StudentAcademicEnrollment.create({
      institutionId: targetInstitutionId,
      academicYearId,
      studentId,
      classId,
      sectionId,
      rollNumber: rollNumber ? rollNumber.trim() : '',
      enrollmentStatus: statusToUse,
      joinedAt: req.body.joinedAt || Date.now()
    });

    // Sync classId, sectionId, rollNumber to StudentProfile if active
    if (statusToUse === 'active') {
      student.classId = classId;
      student.sectionId = sectionId;
      if (rollNumber) student.rollNumber = rollNumber.trim();
      await student.save();
    }

    await logAuditEvent({
      actor: req.user,
      action: 'STUDENT_ENROLLMENT_CREATED',
      institutionId: targetInstitutionId,
      details: { enrollmentId: enrollment._id, studentId, classId, sectionId, enrollmentStatus: statusToUse },
      req
    });

    return sendSuccess(res, 201, 'Student academic enrollment created successfully.', { enrollment });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Student Academic Enrollments List
 * @route   GET /api/v1/student-enrollments
 * @access  Private
 */
const getStudentEnrollments = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else if (req.user.role === 'student') {
      const studentProfile = await StudentProfile.findOne({ userId: req.user._id });
      if (!studentProfile) {
        return sendSuccess(res, 200, 'No student profile found.', { count: 0, enrollments: [] });
      }
      filter.studentId = studentProfile._id;
      filter.institutionId = req.user.institutionId;
    } else if (req.user.role === 'parent') {
      // Find linked children
      const links = await ParentChildLink.find({ parentId: req.user._id });
      const linkedUserIds = links.map(l => l.studentId);
      const studentProfiles = await StudentProfile.find({ userId: { $in: linkedUserIds } });
      const studentProfileIds = studentProfiles.map(sp => sp._id);

      filter.studentId = { $in: studentProfileIds };
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.enrollmentStatus) filter.enrollmentStatus = req.query.enrollmentStatus.toLowerCase();

    const enrollments = await StudentAcademicEnrollment.find(filter)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('academicYearId', 'name status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Student enrollments retrieved successfully.', {
      count: enrollments.length,
      enrollments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Enrollments for a Specific Student
 * @route   GET /api/v1/student-enrollments/student/:studentId
 * @access  Private
 */
const getEnrollmentsByStudentId = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.studentId)) {
      return sendError(res, 400, 'Invalid Student ID.');
    }

    const student = await StudentProfile.findById(req.params.studentId);
    if (!student) {
      return sendError(res, 404, 'Student profile not found.');
    }

    // Role checks
    if (req.user.role === 'student') {
      if (student.userId.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Forbidden: You can view only your own academic enrollment data.');
      }
    } else if (req.user.role === 'parent') {
      const isLinked = await ParentChildLink.findOne({
        parentId: req.user._id,
        studentId: student.userId
      });
      if (!isLinked) {
        return sendError(res, 403, 'Forbidden: You can view academic data only for your linked children.');
      }
    } else if (req.user.role !== 'super_admin') {
      if (student.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access student academic data from another institution.');
      }
    }

    const enrollments = await StudentAcademicEnrollment.find({ studentId: req.params.studentId })
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('academicYearId', 'name status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Student enrollments retrieved.', {
      count: enrollments.length,
      enrollments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Enrollments for a Specific Class
 * @route   GET /api/v1/student-enrollments/class/:classId
 * @access  Private
 */
const getEnrollmentsByClassId = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.classId)) {
      return sendError(res, 400, 'Invalid Class ID.');
    }

    const targetClass = await Class.findById(req.params.classId);
    if (!targetClass) {
      return sendError(res, 404, 'Class not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (targetClass.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access class enrollments from another institution.');
      }
    }

    const filter = { classId: req.params.classId };
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.enrollmentStatus) filter.enrollmentStatus = req.query.enrollmentStatus.toLowerCase();

    const enrollments = await StudentAcademicEnrollment.find(filter)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('sectionId', 'name roomNumber')
      .populate('academicYearId', 'name status')
      .sort({ rollNumber: 1, createdAt: -1 });

    return sendSuccess(res, 200, 'Class enrollments retrieved.', {
      count: enrollments.length,
      enrollments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Student Enrollment
 * @route   PATCH /api/v1/student-enrollments/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateStudentEnrollment = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Enrollment ID.');
    }

    const enrollment = await StudentAcademicEnrollment.findById(req.params.id);
    if (!enrollment) {
      return sendError(res, 404, 'Enrollment record not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (enrollment.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update enrollment for another institution.');
      }
    }

    const { rollNumber, enrollmentStatus } = req.body;

    if (rollNumber !== undefined) enrollment.rollNumber = rollNumber.trim();
    if (enrollmentStatus !== undefined) {
      if (!['active', 'promoted', 'transferred', 'withdrawn', 'completed'].includes(enrollmentStatus)) {
        return sendError(res, 400, 'Invalid enrollment status.');
      }
      enrollment.enrollmentStatus = enrollmentStatus;
    }

    await enrollment.save();

    await logAuditEvent({
      actor: req.user,
      action: 'STUDENT_ENROLLMENT_UPDATED',
      institutionId: enrollment.institutionId,
      details: { enrollmentId: enrollment._id, rollNumber: enrollment.rollNumber, enrollmentStatus: enrollment.enrollmentStatus },
      req
    });

    return sendSuccess(res, 200, 'Student enrollment updated successfully.', { enrollment });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Transfer Student to Another Class/Section
 * @route   PATCH /api/v1/student-enrollments/:id/transfer
 * @access  Private (Super Admin, Institution Admin)
 */
const transferStudentEnrollment = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Enrollment ID.');
    }

    const enrollment = await StudentAcademicEnrollment.findById(req.params.id);
    if (!enrollment) {
      return sendError(res, 404, 'Enrollment record not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (enrollment.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot transfer student in another institution.');
      }
    }

    const { newClassId, newSectionId, rollNumber, enrollmentStatus } = req.body;

    if (!newClassId || !isValidObjectId(newClassId)) {
      return sendError(res, 400, 'Valid newClassId is required for transfer.');
    }
    if (!newSectionId || !isValidObjectId(newSectionId)) {
      return sendError(res, 400, 'Valid newSectionId is required for transfer.');
    }

    // Verify new class & section
    const targetClass = await Class.findById(newClassId);
    if (!targetClass || targetClass.institutionId.toString() !== enrollment.institutionId.toString()) {
      return sendError(res, 400, 'Target class is invalid or belongs to another institution.');
    }

    const targetSection = await Section.findById(newSectionId);
    if (!targetSection || targetSection.institutionId.toString() !== enrollment.institutionId.toString()) {
      return sendError(res, 400, 'Target section is invalid or belongs to another institution.');
    }

    if (targetSection.classId.toString() !== newClassId.toString()) {
      return sendError(res, 400, 'Target section does not belong to target class.');
    }

    // Update existing enrollment or change status
    enrollment.classId = newClassId;
    enrollment.sectionId = newSectionId;
    if (rollNumber) enrollment.rollNumber = rollNumber.trim();
    if (enrollmentStatus) enrollment.enrollmentStatus = enrollmentStatus;

    await enrollment.save();

    // Also update StudentProfile
    const student = await StudentProfile.findById(enrollment.studentId);
    if (student) {
      student.classId = newClassId;
      student.sectionId = newSectionId;
      if (rollNumber) student.rollNumber = rollNumber.trim();
      await student.save();
    }

    await logAuditEvent({
      actor: req.user,
      action: 'STUDENT_ENROLLMENT_TRANSFERRED',
      institutionId: enrollment.institutionId,
      details: { enrollmentId: enrollment._id, newClassId, newSectionId },
      req
    });

    return sendSuccess(res, 200, 'Student transferred successfully.', { enrollment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStudentEnrollment,
  getStudentEnrollments,
  getEnrollmentsByStudentId,
  getEnrollmentsByClassId,
  updateStudentEnrollment,
  transferStudentEnrollment
};
