const Attendance = require('../models/Attendance');
const TeacherProfile = require('../models/TeacherProfile');
const StudentProfile = require('../models/StudentProfile');
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
  validateAttendanceCorrectionInput,
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
 * Helper: Resolve Teacher Profile for user
 */
const getTeacherProfileForUser = async (userId, institutionId) => {
  return await TeacherProfile.findOne({ userId, institutionId });
};

/**
 * @desc    Create or Update single attendance record
 * @route   POST /api/v1/attendance
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const createOrUpdateAttendance = async (req, res, next) => {
  try {
    // If request contains bulk `records` array, redirect to bulk processing handler
    if (Array.isArray(req.body.records) && req.body.records.length > 0) {
      return bulkSubmitAttendance(req, res, next);
    }

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
      date,
      status,
      remarks
    } = req.body;

    let activeTeacherId = teacherId || null;

    // 1. Teacher Authorization Check
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile) {
        return sendError(res, 403, 'Forbidden: Teacher profile not found for logged-in user.');
      }
      activeTeacherId = teacherProfile._id;

      const teacherCheck = await verifyTeacherAssignment(
        teacherProfile._id,
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
          details: { teacherId: teacherProfile._id, classId, sectionId }
        });
        return sendError(res, teacherCheck.code, teacherCheck.message);
      }
    }

    // 2. Validate Student Enrollment
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

    const normDate = normalizeDate(date || attendanceDate);

    // 3. Duplicate / Upsert Check
    const filter = {
      institutionId: targetInstitutionId,
      academicYearId,
      studentId,
      date: normDate,
      subjectId: subjectId || null
    };

    const existing = await Attendance.findOne(filter);
    if (existing && !req.body.overwrite) {
      return sendError(res, 400, 'Attendance already marked for this student on the specified date.');
    }

    const attendanceRecord = await Attendance.findOneAndUpdate(
      filter,
      {
        institutionId: targetInstitutionId,
        academicYearId,
        classId,
        sectionId,
        studentId,
        teacherId: activeTeacherId,
        subjectId: subjectId || null,
        date: normDate,
        attendanceDate: normDate,
        status,
        remarks: remarks || '',
        markedBy: req.user._id,
        markedByRole: req.user.role,
        updatedBy: req.user._id,
        isDeleted: false
      },
      { new: true, upsert: true, runValidators: true }
    );

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: existing ? 'ATTENDANCE_UPDATED' : 'ATTENDANCE_CREATED',
      target: attendanceRecord._id,
      details: { studentId, date: normDate, status }
    });

    return sendSuccess(res, existing ? 200 : 201, `Attendance ${existing ? 'updated' : 'marked'} successfully`, {
      attendance: attendanceRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk Submit Attendance Records
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
      date,
      records
    } = req.body;

    let activeTeacherId = teacherId || null;

    // Teacher authorization check
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile) {
        return sendError(res, 403, 'Forbidden: Teacher profile not found.');
      }
      activeTeacherId = teacherProfile._id;

      const teacherCheck = await verifyTeacherAssignment(
        teacherProfile._id,
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
          action: 'UNAUTHORIZED_BULK_ATTENDANCE_ATTEMPT',
          details: { teacherId: teacherProfile._id, classId, sectionId }
        });
        return sendError(res, teacherCheck.code, teacherCheck.message);
      }
    }

    const normDate = normalizeDate(date || attendanceDate);

    // Process bulk records
    const processedRecords = [];
    let markedCount = 0;
    let updatedCount = 0;

    for (const rec of records) {
      const filter = {
        institutionId: targetInstitutionId,
        academicYearId,
        studentId: rec.studentId,
        date: normDate,
        subjectId: subjectId || null
      };

      const existing = await Attendance.findOne(filter);
      if (existing) updatedCount++;
      else markedCount++;

      const doc = await Attendance.findOneAndUpdate(
        filter,
        {
          institutionId: targetInstitutionId,
          academicYearId,
          classId,
          sectionId,
          studentId: rec.studentId,
          teacherId: activeTeacherId,
          subjectId: subjectId || null,
          date: normDate,
          attendanceDate: normDate,
          status: rec.status,
          remarks: rec.remarks || '',
          markedBy: req.user._id,
          markedByRole: req.user.role,
          updatedBy: req.user._id,
          isDeleted: false
        },
        { new: true, upsert: true, runValidators: true }
      );
      processedRecords.push(doc);
    }

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'ATTENDANCE_BULK_MARKED',
      details: { classId, sectionId, date: normDate, markedCount, updatedCount, totalRecords: records.length }
    });

    return sendSuccess(res, 201, `Bulk attendance processed. ${markedCount} marked, ${updatedCount} updated.`, {
      total: records.length,
      markedCount,
      updatedCount,
      attendanceRecords: processedRecords
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Attendance Records with Role & Tenant Filtering
 * @route   GET /api/v1/attendance
 * @access  Private
 */
const getAttendanceRecords = async (req, res, next) => {
  try {
    const filter = { isDeleted: { $ne: true } };

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    const {
      academicYearId,
      classId,
      sectionId,
      studentId,
      date,
      startDate,
      endDate,
      status
    } = req.query;

    if (academicYearId) filter.academicYearId = academicYearId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (status) filter.status = status;

    if (date) {
      filter.date = normalizeDate(date);
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = normalizeDate(startDate);
      if (endDate) filter.date.$lte = normalizeDate(endDate);
    }

    // Role-based Access Control Enforcement
    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: filter.institutionId });
      if (!myProfile) return sendError(res, 403, 'Student profile not found.');
      if (studentId && studentId !== myProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: Students can view only their own attendance.');
      }
      filter.studentId = myProfile._id;
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, filter.institutionId);
      if (linkedStudentIds.length === 0) {
        return sendSuccess(res, 200, 'Attendance records retrieved', { count: 0, attendance: [] });
      }
      if (studentId) {
        if (!linkedStudentIds.includes(studentId.toString())) {
          return sendError(res, 403, 'Forbidden: Parents can view attendance only for linked children.');
        }
        filter.studentId = studentId;
      } else {
        filter.studentId = { $in: linkedStudentIds };
      }
    } else if (studentId) {
      filter.studentId = studentId;
    }

    const records = await Attendance.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber profilePhoto',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('academicYearId', 'name status')
      .populate('markedBy', 'fullName email role')
      .sort({ date: -1, createdAt: -1 });

    return sendSuccess(res, 200, 'Attendance records retrieved successfully', {
      count: records.length,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Student Attendance History
 * @route   GET /api/v1/attendance/student/:studentId
 * @access  Private
 */
const getStudentAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!isValidObjectId(studentId)) {
      return sendError(res, 400, 'Invalid Student ID.');
    }

    const student = await StudentProfile.findById(studentId);
    if (!student) {
      return sendError(res, 404, 'Student profile not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? student.institutionId : req.user.institutionId;

    if (student.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot access student attendance from another institution.');
    }

    // Role checks
    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      if (!myProfile || myProfile._id.toString() !== studentId.toString()) {
        return sendError(res, 403, 'Forbidden: You can view only your own attendance history.');
      }
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, targetInstitutionId);
      if (!linkedStudentIds.includes(studentId.toString())) {
        return sendError(res, 403, 'Forbidden: You can view attendance only for linked children.');
      }
    }

    const filter = { studentId, institutionId: targetInstitutionId, isDeleted: { $ne: true } };
    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.status) filter.status = req.query.status;

    const records = await Attendance.find(filter)
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('academicYearId', 'name status')
      .sort({ date: -1 });

    const summary = computeSummaryStats(records);

    return sendSuccess(res, 200, 'Student attendance history retrieved', {
      student,
      summary,
      count: records.length,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Class / Section Attendance
 * @route   GET /api/v1/attendance/class/:classId or /api/v1/attendance/class/:classId/section/:sectionId
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const getClassSectionAttendance = async (req, res, next) => {
  try {
    const { classId, sectionId } = req.params;
    if (!isValidObjectId(classId)) {
      return sendError(res, 400, 'Invalid Class ID.');
    }

    const filter = { classId, isDeleted: { $ne: true } };

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (sectionId && isValidObjectId(sectionId)) {
      filter.sectionId = sectionId;
    } else if (req.query.sectionId) {
      filter.sectionId = req.query.sectionId;
    }

    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.date) filter.date = normalizeDate(req.query.date);

    const records = await Attendance.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('sectionId', 'name roomNumber')
      .populate('academicYearId', 'name')
      .sort({ date: -1 });

    return sendSuccess(res, 200, 'Class attendance records retrieved', {
      count: records.length,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Daily Attendance for a Specific Date
 * @route   GET /api/v1/attendance/date/:date
 * @access  Private
 */
const getDailyAttendance = async (req, res, next) => {
  try {
    const { date } = req.params;
    if (!date || isNaN(Date.parse(date))) {
      return sendError(res, 400, 'Valid date parameter is required.');
    }

    const normDate = normalizeDate(date);
    const filter = { date: normDate, isDeleted: { $ne: true } };

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;

    const records = await Attendance.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, `Daily attendance for ${normDate.toISOString().split('T')[0]} retrieved`, {
      date: normDate,
      count: records.length,
      attendance: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Correct / Update Attendance by ID (Requires Correction Reason)
 * @route   PATCH /api/v1/attendance/:id
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const updateAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Attendance ID.');
    }

    const record = await Attendance.findById(id);
    if (!record || record.isDeleted) {
      return sendError(res, 404, 'Attendance record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? record.institutionId : req.user.institutionId;
    if (record.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot edit attendance for another institution.');
    }

    // Require correction reason when changing finalized record
    const val = validateAttendanceCorrectionInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const { status, remarks, correctionReason } = req.body;
    const oldStatus = record.status;

    if (status) record.status = status;
    if (remarks !== undefined) record.remarks = remarks;
    record.correctionReason = correctionReason.trim();
    record.updatedBy = req.user._id;

    await record.save();

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'ATTENDANCE_CORRECTED',
      target: record._id,
      details: {
        studentId: record.studentId,
        oldStatus,
        newStatus: record.status,
        correctionReason: record.correctionReason
      }
    });

    return sendSuccess(res, 200, 'Attendance corrected successfully', {
      attendance: record
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Soft Delete Attendance Record
 * @route   DELETE /api/v1/attendance/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const deleteAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Attendance ID.');
    }

    const record = await Attendance.findById(id);
    if (!record || record.isDeleted) {
      return sendError(res, 404, 'Attendance record not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? record.institutionId : req.user.institutionId;
    if (record.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot delete attendance for another institution.');
    }

    record.isDeleted = true;
    record.updatedBy = req.user._id;
    await record.save();

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'ATTENDANCE_DELETED',
      target: record._id,
      details: { studentId: record.studentId, date: record.date }
    });

    return sendSuccess(res, 200, 'Attendance record soft deleted successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Attendance Summary for a Student
 * @route   GET /api/v1/attendance/summary/student/:studentId
 * @access  Private
 */
const getStudentSummary = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!isValidObjectId(studentId)) {
      return sendError(res, 400, 'Invalid Student ID.');
    }

    const student = await StudentProfile.findById(studentId);
    if (!student) {
      return sendError(res, 404, 'Student profile not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? student.institutionId : req.user.institutionId;

    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      if (!myProfile || myProfile._id.toString() !== studentId.toString()) {
        return sendError(res, 403, 'Forbidden: You can view only your own attendance summary.');
      }
    } else if (req.user.role === 'parent') {
      const linkedStudentIds = await getParentLinkedStudentProfileIds(req.user._id, targetInstitutionId);
      if (!linkedStudentIds.includes(studentId.toString())) {
        return sendError(res, 403, 'Forbidden: You can view attendance summary only for linked children.');
      }
    }

    const filter = { studentId, institutionId: targetInstitutionId, isDeleted: { $ne: true } };
    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;

    const records = await Attendance.find(filter);
    const summary = computeSummaryStats(records);

    return sendSuccess(res, 200, 'Student attendance summary calculated', {
      student,
      summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Class-Level Attendance Summary
 * @route   GET /api/v1/attendance/summary/class/:classId
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const getClassSummary = async (req, res, next) => {
  try {
    const { classId } = req.params;
    if (!isValidObjectId(classId)) {
      return sendError(res, 400, 'Invalid Class ID.');
    }

    const filter = { classId, isDeleted: { $ne: true } };

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;

    const records = await Attendance.find(filter);
    const summary = computeSummaryStats(records);

    return sendSuccess(res, 200, 'Class attendance summary calculated', {
      classId,
      sectionId: req.query.sectionId || null,
      summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Attendance Reports (Date Range / Monthly)
 * @route   GET /api/v1/attendance/reports
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const getAttendanceReports = async (req, res, next) => {
  try {
    const filter = { isDeleted: { $ne: true } };

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    const { academicYearId, classId, sectionId, startDate, endDate, month } = req.query;

    if (academicYearId) filter.academicYearId = academicYearId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;

    if (month) {
      // Month parameter format: YYYY-MM
      const [yr, m] = month.split('-').map(Number);
      if (yr && m) {
        const start = new Date(Date.UTC(yr, m - 1, 1));
        const end = new Date(Date.UTC(yr, m, 0, 23, 59, 59));
        filter.date = { $gte: start, $lte: end };
      }
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = normalizeDate(startDate);
      if (endDate) filter.date.$lte = normalizeDate(endDate);
    }

    const records = await Attendance.find(filter)
      .populate({
        path: 'studentId',
        select: 'studentId userId rollNumber',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .sort({ date: -1 });

    const summary = computeSummaryStats(records);

    return sendSuccess(res, 200, 'Attendance report generated successfully', {
      summary,
      count: records.length,
      attendance: records
    });
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
  getDailyAttendance,
  updateAttendanceById,
  deleteAttendanceById,
  getStudentSummary,
  getClassSummary,
  getAttendanceReports
};
