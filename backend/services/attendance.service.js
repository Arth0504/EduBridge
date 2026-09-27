const Attendance = require('../models/Attendance');
const TeacherProfile = require('../models/TeacherProfile');
const StudentProfile = require('../models/StudentProfile');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const StudentAcademicEnrollment = require('../models/StudentAcademicEnrollment');
const AcademicYear = require('../models/AcademicYear');
const Subject = require('../models/Subject');
const ParentChildLink = require('../models/ParentChildLink');

/**
 * Normalizes date string/object to UTC midnight for clean indexing and date comparisons.
 */
const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Validates teacher assignment for institution, academic year, class, section, and optional subject.
 */
const verifyTeacherAssignment = async (teacherProfileId, institutionId, academicYearId, classId, sectionId, subjectId = null) => {
  const teacher = await TeacherProfile.findById(teacherProfileId);
  if (!teacher) {
    return { valid: false, code: 404, message: 'Teacher profile not found.' };
  }
  if (teacher.institutionId.toString() !== institutionId.toString()) {
    return { valid: false, code: 403, message: 'Teacher belongs to a different institution.' };
  }

  const query = {
    institutionId,
    academicYearId,
    teacherId: teacherProfileId,
    classId,
    sectionId,
    isActive: true
  };

  if (subjectId) {
    query.subjectId = subjectId;
  }

  const assignment = await TeacherSubjectAssignment.findOne(query);
  if (!assignment) {
    return {
      valid: false,
      code: 403,
      message: 'Teacher is not assigned to this class/section/subject for the specified academic year.'
    };
  }

  return { valid: true, teacher };
};

/**
 * Validates student academic enrollment for institution, academic year, class, and section.
 */
const verifyStudentEnrollment = async (studentProfileId, institutionId, academicYearId, classId, sectionId) => {
  const student = await StudentProfile.findById(studentProfileId);
  if (!student) {
    return { valid: false, code: 404, message: `Student profile not found: ${studentProfileId}` };
  }
  if (student.institutionId.toString() !== institutionId.toString()) {
    return { valid: false, code: 403, message: `Student ${student.studentId} belongs to a different institution.` };
  }

  const enrollment = await StudentAcademicEnrollment.findOne({
    institutionId,
    academicYearId,
    studentId: studentProfileId,
    classId,
    sectionId,
    enrollmentStatus: { $in: ['active', 'promoted'] }
  });

  if (!enrollment) {
    return {
      valid: false,
      code: 400,
      message: `Student is not enrolled in the specified class/section for academic year.`
    };
  }

  return { valid: true, student, enrollment };
};

/**
 * Computes attendance summary metrics (working days, present, absent, late, leave, percentage).
 */
const computeSummaryStats = (records) => {
  const totalWorkingDays = records.length;
  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;

  records.forEach((r) => {
    if (r.status === 'present') present += 1;
    else if (r.status === 'absent') absent += 1;
    else if (r.status === 'late') late += 1;
    else if (r.status === 'leave') leave += 1;
  });

  // Late and present count as attended, or standard percentage calculation: (present + late) / total
  const attendedCount = present + late;
  const attendancePercentage = totalWorkingDays > 0
    ? Number(((attendedCount / totalWorkingDays) * 100).toFixed(2))
    : 0;

  return {
    totalWorkingDays,
    present,
    absent,
    late,
    leave,
    attendedCount,
    attendancePercentage
  };
};

module.exports = {
  normalizeDate,
  verifyTeacherAssignment,
  verifyStudentEnrollment,
  computeSummaryStats
};
