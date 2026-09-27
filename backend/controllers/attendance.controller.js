const Attendance = require('../models/Attendance');
const TeacherProfile = require('../models/TeacherProfile');
const StudentProfile = require('../models/StudentProfile');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const StudentAcademicEnrollment = require('../models/StudentAcademicEnrollment');
const ParentChildLink = require('../models/ParentChildLink');
const Class = require('../models/Class');
const Section = require('../models/Section');
const AcademicYear = require('../models/AcademicYear');
const Subject = require('../models/Subject');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logAuditEvent } = require('../utils/auditLogger');
const {
  validateSingleAttendanceInput,
  validateBulkAttendanceInput,
  isValidObjectId
} = require('../validations/attendance.validation');
const {
  normalizeDate,
  verifyTeacherAssignment,
  verifyStudentEnrollment,
  computeSummaryStats
} = require('../services/attendance.service');

/**
 * Helper: Resolve student profile IDs linked to a parent
 */
const getParentLinkedStudentProfileIds = async (parentUserId, institutionId) => {
  const links = await ParentChildLink.find({ parentId: parentUserId, institutionId });
  const studentUserIds = links.map((l) => l.studentId);
  const profiles = await StudentProfile.find({ userId: { $in: studentUserIds }, institutionId });
  return profiles.map((p) => p._id.toString());
};

/**
 * Helper: Resolve Teacher Profile for current logged-in user if teacher
 */
const getTeacherProfileForUser = async (userId, institutionId) => {
  return await TeacherProfile.findOne({ userId, institutionId });
};

/**
 * Helper: Resolve Student Profile for current logged-in user if student
 */
const getStudentProfileForUser = async (userId, institutionId) => {
  return await StudentProfile.findOne({ userId, institutionId });
};

/**
 * @desc    Create or update single attendance record
 * @route   POST /api/v1/attendance
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const createOrUpdateAttendance = async (req, res, next) => {
  try {
    const val = validateSingleAttendanceInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const {
      academicYearId,
      classId,
      sectionId,
      studentId,
      teacherId,
      subjectId,
      attendanceDate,
      status,
      remarks
    } = req.body;

    // 1. Verify Teacher role scope if logged-in user is a teacher
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile || teacherProfile._id.toString() !== teacherId.toString()) {
        return sendError(res, 403, 'Teachers can only mark attendance using their own profile ID.');
      }
    }

    // 2. Validate Teacher Assignment
    const teacherCheck = await verifyTeacherAssignment(
      teacherId,
      targetInstitutionId,
      academicYearId,
      classId,
      sectionId,
      subjectId || null
    );
    if (!teacherCheck.valid) {
      logAuditEvent({
        actor: req.user._id,
        institution: targetInstitutionId,
        action: 'UNAUTHORIZED_ATTENDANCE_ATTEMPT',
        target: teacherId,
        details: { reason: teacherCheck.message, classId, sectionId, academicYearId }
      });
      return sendError(res, teacherCheck.code, teacherCheck.message);
    }

    // 3. Validate Student Enrollment
    const studentCheck = await verifyStudentEnrollment(
      studentId,
      targetInstitutionId,
      academicYearId,
      classId,
      sectionId
    );
    if (!studentCheck.valid) {
      return sendError(res, studentCheck.code, studentCheck.message);
    }

    // 4. Validate subject if provided
    if (subjectId) {
      const subj = await Subject.findById(subjectId);
      if (!subj || subj.institutionId.toString() !== targetInstitutionId.toString()) {
        return sendError(res, 400, 'Subject not found or belongs to another institution.');
      }
    }

    const normDate = normalizeDate(attendanceDate);

    // 5. Upsert attendance record
    const filter = {
      institutionId: targetInstitutionId,
      academicYearId,
      classId,
      sectionId,
      studentId,
      attendanceDate: normDate,
      subjectId: subjectId || null
    };

    const existing = await Attendance.findOne(filter);
    const isNew = !existing;

    const record = await Attendance.findOneAndUpdate(
      filter,
      {
        institutionId: targetInstitutionId,
        academicYearId,
        classId,
        sectionId,
        studentId,
        subjectId: subjectId || null,
        teacherId,
        attendanceDate: normDate,
        status,
        remarks: remarks || '',
        ...(isNew ? { createdBy: req.user._id } : { updatedBy: req.user._id })
      },
      { upsert: true, new: true, runValidators: true }
    );

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: isNew ? 'ATTENDANCE_CREATED' : 'ATTENDANCE_UPDATED',
      target: record._id,
      details: { studentId, classId, sectionId, attendanceDate: normDate, status }
    });

    return sendSuccess(res, isNew ? 201 : 200, `Attendance record ${isNew ? 'created' : 'updated'} successfully`, {
      attendance: record
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit bulk attendance for a class/section
 * @route   POST /api/v1/attendance/bulk
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const bulkSubmitAttendance = async (req, res, next) => {
  try {
    const val = validateBulkAttendanceInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const {
      academicYearId,
      classId,
      sectionId,
      teacherId,
      subjectId,
      attendanceDate,
      records
    } = req.body;

    // 1. Verify Teacher role scope if logged-in user is teacher
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile || teacherProfile._id.toString() !== teacherId.toString()) {
        return sendError(res, 403, 'Teachers can only submit bulk attendance using their own teacher profile ID.');
      }
    }

    // 2. Validate Teacher Assignment
    const teacherCheck = await verifyTeacherAssignment(
      teacherId,
      targetInstitutionId,
      academicYearId,
      classId,
      sectionId,
      subjectId || null
    );
    if (!teacherCheck.valid) {
      logAuditEvent({
        actor: req.user._id,
        institution: targetInstitutionId,
        action: 'UNAUTHORIZED_ATTENDANCE_ATTEMPT',
        target: teacherId,
        details: { reason: teacherCheck.message, classId, sectionId, academicYearId }
      });
      return sendError(res, teacherCheck.code, teacherCheck.message);
    }

    const normDate = normalizeDate(attendanceDate);

    // 3. Pre-validate ALL students in batch to ensure zero partial unauthorized writes
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const studentCheck = await verifyStudentEnrollment(
        rec.studentId,
        targetInstitutionId,
        academicYearId,
        classId,
        sectionId
      );
      if (!studentCheck.valid) {
        return sendError(res, studentCheck.code, `Student record [${i}]: ${studentCheck.message}`);
      }
    }

    // 4. Perform bulk upsert operations safely
    const bulkOps = records.map((rec) => {
      const filter = {
        institutionId: targetInstitutionId,
        academicYearId,
        classId,
        sectionId,
        studentId: rec.studentId,
        attendanceDate: normDate,
        subjectId: subjectId || null
      };

      return {
        updateOne: {
          filter,
          update: {
            $set: {
              institutionId: targetInstitutionId,
              academicYearId,
              classId,
              sectionId,
              studentId: rec.studentId,
              subjectId: subjectId || null,
              teacherId,
              attendanceDate: normDate,
              status: rec.status,
              remarks: rec.remarks || '',
              updatedBy: req.user._id
            },
            $setOnInsert: {
              createdBy: req.user._id
            }
          },
          upsert: true
        }
      };
    });

    const result = await Attendance.bulkWrite(bulkOps);

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'BULK_ATTENDANCE_SUBMITTED',
      target: classId,
      details: {
        sectionId,
        academicYearId,
        subjectId: subjectId || null,
        attendanceDate: normDate,
        totalRecords: records.length,
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount
      }
    });

    return sendSuccess(res, 200, `Bulk attendance submitted successfully for ${records.length} students`, {
      processedCount: records.length,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance records with filtering, pagination & isolation checks
 * @route   GET /api/v1/attendance
 * @access  Private
 */
const getAttendanceRecords = async (req, res, next) => {
  try {
    const filter = {};

    // 1. Institution Isolation
    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    const {
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      studentId,
      attendanceDate,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50
    } = req.query;

    if (academicYearId) filter.academicYearId = academicYearId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (subjectId) filter.subjectId = subjectId;
    if (teacherId) filter.teacherId = teacherId;
    if (status) filter.status = status;

    if (attendanceDate) {
      filter.attendanceDate = normalizeDate(attendanceDate);
    } else if (startDate || endDate) {
      filter.attendanceDate = {};
      if (startDate) filter.attendanceDate.$gte = normalizeDate(startDate);
      if (endDate) filter.attendanceDate.$lte = normalizeDate(endDate);
    }

    // 2. Role-based Scope Enforcement
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, filter.institutionId);
      if (!teacherProfile) {
        return sendError(res, 403, 'Teacher profile not found.');
      }

      // Find all active assignments for this teacher in specified/current academic year
      const assignFilter = {
        institutionId: filter.institutionId,
        teacherId: teacherProfile._id,
        isActive: true
      };
      if (academicYearId) assignFilter.academicYearId = academicYearId;

      const assignments = await TeacherSubjectAssignment.find(assignFilter);
      if (!assignments || assignments.length === 0) {
        // Teacher has no assignments, return empty array
        return sendSuccess(res, 200, 'Attendance records retrieved', { count: 0, total: 0, page: 1, pages: 1, attendance: [] });
      }

      // If user queried a specific class/section/subject, verify authorization!
      if (classId && sectionId) {
        const isAssigned = assignments.some(
          (a) =>
            a.classId.toString() === classId.toString() &&
            a.sectionId.toString() === sectionId.toString() &&
            (!subjectId || a.subjectId.toString() === subjectId.toString())
        );
        if (!isAssigned) {
          return sendError(res, 403, 'Forbidden: You are not authorized to view attendance for this class/section/subject.');
        }
      } else {
        // Limit query to teacher's authorized class/section combinations
        const conditions = assignments.map((a) => ({
          classId: a.classId,
          sectionId: a.sectionId
        }));
        filter.$or = conditions;
      }
    } else if (req.user.role === 'student') {
      const studentProfile = await getStudentProfileForUser(req.user._id, filter.institutionId);
      if (!studentProfile) {
        return sendError(res, 403, 'Student profile not found.');
      }
      if (studentId && studentId !== studentProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: Students can only view their own attendance.');
      }
      filter.studentId = studentProfile._id;
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, filter.institutionId);
      if (linkedStudentIds.length === 0) {
        return sendSuccess(res, 200, 'Attendance records retrieved', { count: 0, total: 0, page: 1, pages: 1, attendance: [] });
      }
      if (studentId) {
        if (!linkedStudentIds.includes(studentId.toString())) {
          return sendError(res, 403, 'Forbidden: Parent can only view attendance for linked children.');
        }
        filter.studentId = studentId;
      } else {
        filter.studentId = { $in: linkedStudentIds };
      }
    } else {
      if (studentId) filter.studentId = studentId;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId classId sectionId rollNumber profilePhoto',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate({
        path: 'teacherId',
        select: 'employeeId userId designation',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('classId', 'className code')
      .populate('sectionId', 'sectionName code')
      .populate('subjectId', 'subjectName subjectCode')
      .populate('academicYearId', 'yearName isCurrent')
      .sort({ attendanceDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return sendSuccess(res, 200, 'Attendance records retrieved successfully', {
      count: records.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance for specific student with summary stats
 * @route   GET /api/v1/attendance/student/:studentId
 * @access  Private
 */
const getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { academicYearId, startDate, endDate, subjectId } = req.query;

    if (!isValidObjectId(studentId)) {
      return sendError(res, 400, 'Invalid studentId format.');
    }

    const studentProfile = await StudentProfile.findById(studentId);
    if (!studentProfile) {
      return sendError(res, 404, 'Student profile not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? studentProfile.institutionId : req.user.institutionId;

    if (studentProfile.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    // Role Security Enforcement
    if (req.user.role === 'student') {
      const myProfile = await getStudentProfileForUser(req.user._id, targetInstitutionId);
      if (!myProfile || myProfile._id.toString() !== studentId.toString()) {
        return sendError(res, 403, 'Forbidden: You can only view your own attendance history.');
      }
    } else if (req.user.role === 'parent') {
      const linkedIds = await getParentLinkedStudentProfileIds(req.user._id, targetInstitutionId);
      if (!linkedIds.includes(studentId.toString())) {
        return sendError(res, 403, 'Forbidden: You can only view attendance for linked children.');
      }
    } else if (req.user.role === 'teacher') {
      // Verify teacher is assigned to at least one class/section where student is enrolled
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile) {
        return sendError(res, 403, 'Teacher profile not found.');
      }

      const teacherAssignments = await TeacherSubjectAssignment.find({
        institutionId: targetInstitutionId,
        teacherId: teacherProfile._id,
        isActive: true
      });

      const allowedScopes = teacherAssignments.map((a) => ({
        classId: a.classId.toString(),
        sectionId: a.sectionId.toString()
      }));

      // Check student enrollments
      const enrollments = await StudentAcademicEnrollment.find({
        institutionId: targetInstitutionId,
        studentId
      });

      const isAuthorized = enrollments.some((e) =>
        allowedScopes.some(
          (scope) => scope.classId === e.classId.toString() && scope.sectionId === e.sectionId.toString()
        )
      );

      if (!isAuthorized) {
        return sendError(res, 403, 'Forbidden: You are not assigned to any class/section for this student.');
      }
    }

    const filter = {
      institutionId: targetInstitutionId,
      studentId
    };

    if (academicYearId) filter.academicYearId = academicYearId;
    if (subjectId) filter.subjectId = subjectId;

    if (startDate || endDate) {
      filter.attendanceDate = {};
      if (startDate) filter.attendanceDate.$gte = normalizeDate(startDate);
      if (endDate) filter.attendanceDate.$lte = normalizeDate(endDate);
    }

    const records = await Attendance.find(filter)
      .populate('classId', 'className code')
      .populate('sectionId', 'sectionName code')
      .populate('subjectId', 'subjectName subjectCode')
      .populate('academicYearId', 'yearName isCurrent')
      .sort({ attendanceDate: -1 });

    const summary = computeSummaryStats(records);

    return sendSuccess(res, 200, 'Student attendance retrieved successfully', {
      student: {
        _id: studentProfile._id,
        studentId: studentProfile.studentId,
        userId: studentProfile.userId
      },
      summary,
      count: records.length,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance for a specific class and section
 * @route   GET /api/v1/attendance/class/:classId/section/:sectionId
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const getClassSectionAttendance = async (req, res, next) => {
  try {
    const { classId, sectionId } = req.params;
    const { academicYearId, subjectId, attendanceDate, startDate, endDate } = req.query;

    if (!isValidObjectId(classId) || !isValidObjectId(sectionId)) {
      return sendError(res, 400, 'Invalid classId or sectionId format.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.query.institutionId || req.user.institutionId : req.user.institutionId;

    // Role Security Enforcement
    if (req.user.role === 'student') {
      return sendError(res, 403, 'Forbidden: Students cannot access class-wide attendance.');
    }
    if (req.user.role === 'parent') {
      return sendError(res, 403, 'Forbidden: Parents cannot access class-wide attendance.');
    }

    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile) {
        return sendError(res, 403, 'Teacher profile not found.');
      }

      const assignFilter = {
        institutionId: targetInstitutionId,
        teacherId: teacherProfile._id,
        classId,
        sectionId,
        isActive: true
      };
      if (academicYearId) assignFilter.academicYearId = academicYearId;
      if (subjectId) assignFilter.subjectId = subjectId;

      const assignment = await TeacherSubjectAssignment.findOne(assignFilter);
      if (!assignment) {
        return sendError(res, 403, 'Forbidden: You are not assigned to this class and section.');
      }
    }

    const filter = {
      institutionId: targetInstitutionId,
      classId,
      sectionId
    };

    if (academicYearId) filter.academicYearId = academicYearId;
    if (subjectId) filter.subjectId = subjectId;

    if (attendanceDate) {
      filter.attendanceDate = normalizeDate(attendanceDate);
    } else if (startDate || endDate) {
      filter.attendanceDate = {};
      if (startDate) filter.attendanceDate.$gte = normalizeDate(startDate);
      if (endDate) filter.attendanceDate.$lte = normalizeDate(endDate);
    }

    const records = await Attendance.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber profilePhoto',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('subjectId', 'subjectName subjectCode')
      .populate('academicYearId', 'yearName isCurrent')
      .sort({ attendanceDate: -1, studentId: 1 });

    const summary = computeSummaryStats(records);

    return sendSuccess(res, 200, 'Class section attendance retrieved successfully', {
      classId,
      sectionId,
      summary,
      count: records.length,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get aggregate summary statistics across role scope
 * @route   GET /api/v1/attendance/summary
 * @access  Private
 */
const getAttendanceSummary = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    const { academicYearId, classId, sectionId, subjectId, startDate, endDate } = req.query;

    if (academicYearId) filter.academicYearId = academicYearId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (subjectId) filter.subjectId = subjectId;

    if (startDate || endDate) {
      filter.attendanceDate = {};
      if (startDate) filter.attendanceDate.$gte = normalizeDate(startDate);
      if (endDate) filter.attendanceDate.$lte = normalizeDate(endDate);
    }

    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, filter.institutionId);
      if (!teacherProfile) {
        return sendError(res, 403, 'Teacher profile not found.');
      }
      const assignFilter = { institutionId: filter.institutionId, teacherId: teacherProfile._id, isActive: true };
      if (academicYearId) assignFilter.academicYearId = academicYearId;
      const assignments = await TeacherSubjectAssignment.find(assignFilter);
      if (!assignments || assignments.length === 0) {
        return sendSuccess(res, 200, 'Attendance summary retrieved', {
          summary: computeSummaryStats([])
        });
      }
      filter.$or = assignments.map((a) => ({ classId: a.classId, sectionId: a.sectionId }));
    } else if (req.user.role === 'student') {
      const studentProfile = await getStudentProfileForUser(req.user._id, filter.institutionId);
      if (!studentProfile) return sendError(res, 403, 'Student profile not found.');
      filter.studentId = studentProfile._id;
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, filter.institutionId);
      if (linkedStudentIds.length === 0) {
        return sendSuccess(res, 200, 'Attendance summary retrieved', { summary: computeSummaryStats([]) });
      }
      filter.studentId = { $in: linkedStudentIds };
    }

    const records = await Attendance.find(filter);
    const summary = computeSummaryStats(records);

    return sendSuccess(res, 200, 'Attendance summary retrieved successfully', {
      summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update single attendance record by ID
 * @route   PATCH /api/v1/attendance/:id
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const updateAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid attendance ID format.');
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return sendError(res, 404, 'Attendance record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? attendance.institutionId : req.user.institutionId;

    if (attendance.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    // Role Security Check
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile) {
        return sendError(res, 403, 'Teacher profile not found.');
      }
      const teacherCheck = await verifyTeacherAssignment(
        teacherProfile._id,
        targetInstitutionId,
        attendance.academicYearId,
        attendance.classId,
        attendance.sectionId,
        attendance.subjectId
      );
      if (!teacherCheck.valid) {
        return sendError(res, 403, 'Forbidden: You are not assigned to edit attendance for this class/section.');
      }
    } else if (req.user.role === 'student' || req.user.role === 'parent') {
      return sendError(res, 403, 'Forbidden: You do not have permission to modify attendance.');
    }

    const { status, remarks } = req.body;
    if (status) {
      const validStatuses = ['present', 'absent', 'late', 'leave'];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, `Status must be one of: ${validStatuses.join(', ')}.`);
      }
      attendance.status = status;
    }

    if (remarks !== undefined) {
      attendance.remarks = remarks;
    }

    attendance.updatedBy = req.user._id;
    await attendance.save();

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'ATTENDANCE_UPDATED',
      target: attendance._id,
      details: { status: attendance.status, remarks: attendance.remarks }
    });

    return sendSuccess(res, 200, 'Attendance record updated successfully', {
      attendance
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete single attendance record by ID
 * @route   DELETE /api/v1/attendance/:id
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const deleteAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid attendance ID format.');
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return sendError(res, 404, 'Attendance record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? attendance.institutionId : req.user.institutionId;

    if (attendance.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    // Role Security Check
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile) {
        return sendError(res, 403, 'Teacher profile not found.');
      }
      const teacherCheck = await verifyTeacherAssignment(
        teacherProfile._id,
        targetInstitutionId,
        attendance.academicYearId,
        attendance.classId,
        attendance.sectionId,
        attendance.subjectId
      );
      if (!teacherCheck.valid) {
        return sendError(res, 403, 'Forbidden: You are not authorized to delete attendance for this scope.');
      }
    } else if (req.user.role === 'student' || req.user.role === 'parent') {
      return sendError(res, 403, 'Forbidden: You do not have permission to delete attendance.');
    }

    await Attendance.findByIdAndDelete(id);

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'ATTENDANCE_DELETED',
      target: id,
      details: { studentId: attendance.studentId, date: attendance.attendanceDate }
    });

    return sendSuccess(res, 200, 'Attendance record deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdateAttendance,
  bulkSubmitAttendance,
  getAttendanceRecords,
  getStudentAttendance,
  getClassSectionAttendance,
  getAttendanceSummary,
  updateAttendanceById,
  deleteAttendanceById
};
