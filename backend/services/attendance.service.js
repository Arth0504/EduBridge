const Attendance = require('../models/Attendance');
const TeacherProfile = require('../models/TeacherProfile');
const StudentProfile = require('../models/StudentProfile');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const StudentAcademicEnrollment = require('../models/StudentAcademicEnrollment');
const Section = require('../models/Section');
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
 * Teacher is authorized if they have a TeacherSubjectAssignment OR are assigned as classTeacherId on the Section.
 */
const verifyTeacherAssignment = async (teacherProfileId, institutionId, academicYearId, classId, sectionId, subjectId = null) => {
  const teacher = await TeacherProfile.findById(teacherProfileId);
  if (!teacher) {
    return { valid: false, code: 404, message: 'Teacher profile not found.' };
  }
  if (teacher.institutionId.toString() !== institutionId.toString()) {
    return { valid: false, code: 403, message: 'Teacher belongs to a different institution.' };
  }

  // 1. Check Section classTeacherId
  const section = await Section.findById(sectionId);
  if (section && section.classTeacherId && section.classTeacherId.toString() === teacherProfileId.toString()) {
    return { valid: true, teacher };
  }

  // 2. Check TeacherSubjectAssignment
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
  if (assignment) {
    return { valid: true, teacher };
  }

  return {
    valid: false,
    code: 403,
    message: 'Teacher is not authorized/assigned for this class/section.'
  };
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
 * Computes attendance summary metrics (working days, present, absent, late, half_day, excused, leave, percentage).
 */
const computeSummaryStats = (records) => {
  const totalWorkingDays = records.length;
  let present = 0;
  let absent = 0;
  let late = 0;
  let halfDay = 0;
  let excused = 0;
  let leave = 0;

  records.forEach((r) => {
    if (r.status === 'present') present += 1;
    else if (r.status === 'absent') absent += 1;
    else if (r.status === 'late') late += 1;
    else if (r.status === 'half_day') halfDay += 1;
    else if (r.status === 'excused') excused += 1;
    else if (r.status === 'leave') leave += 1;
  });

  // Calculate percentage: (present + late + halfDay*0.5 + excused) / totalWorkingDays * 100
  const attendedUnits = present + late + (halfDay * 0.5) + excused + leave;
  const attendancePercentage = totalWorkingDays > 0
    ? Number(((attendedUnits / totalWorkingDays) * 100).toFixed(2))
    : 0;

  return {
    totalWorkingDays,
    present,
    absent,
    late,
    halfDay,
    excused,
    leave,
    attendedUnits,
    attendancePercentage: Math.min(100, attendancePercentage)
  };
};

module.exports = {
  normalizeDate,
  verifyTeacherAssignment,
  verifyStudentEnrollment,
  computeSummaryStats
};
