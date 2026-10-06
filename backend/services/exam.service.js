const GradingRule = require('../models/GradingRule');
const TeacherProfile = require('../models/TeacherProfile');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const Section = require('../models/Section');
const ParentChildLink = require('../models/ParentChildLink');
const StudentProfile = require('../models/StudentProfile');

/**
 * Get grading rules for an institution, or return default tiers
 */
const getGradingRulesForInstitution = async (institutionId) => {
  let ruleDoc = await GradingRule.findOne({ institutionId, isDefault: true });
  if (!ruleDoc) {
    ruleDoc = await GradingRule.findOne({ institutionId });
  }

  if (ruleDoc && ruleDoc.rules && ruleDoc.rules.length > 0) {
    return ruleDoc.rules;
  }

  // Default fallback tiers
  return [
    { grade: 'A+', minPercentage: 90, maxPercentage: 100, description: 'Outstanding' },
    { grade: 'A', minPercentage: 80, maxPercentage: 89.99, description: 'Excellent' },
    { grade: 'B+', minPercentage: 70, maxPercentage: 79.99, description: 'Very Good' },
    { grade: 'B', minPercentage: 60, maxPercentage: 69.99, description: 'Good' },
    { grade: 'C', minPercentage: 50, maxPercentage: 59.99, description: 'Satisfactory' },
    { grade: 'D', minPercentage: 40, maxPercentage: 49.99, description: 'Pass' },
    { grade: 'F', minPercentage: 0, maxPercentage: 39.99, description: 'Fail' }
  ];
};

/**
 * Calculate grade from percentage given rules
 */
const calculateGrade = (percentage, rules = []) => {
  const pct = Number(percentage) || 0;

  for (const r of rules) {
    if (pct >= r.minPercentage && pct <= r.maxPercentage) {
      return r.grade;
    }
  }

  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

/**
 * Verify whether a teacher is authorized to enter marks for a subject/class/section
 */
const verifyTeacherExamSubjectAssignment = async (user, institutionId, academicYearId, classId, sectionId, subjectId) => {
  // Super admin and institution admin have universal access
  if (user.role === 'super_admin' || user.role === 'institution_admin') {
    return true;
  }

  if (user.role !== 'teacher') {
    return false;
  }

  // Find teacher profile
  const teacherProfile = await TeacherProfile.findOne({ userId: user._id, institutionId });
  if (!teacherProfile) {
    return false;
  }

  // Check explicit TeacherSubjectAssignment
  const assignment = await TeacherSubjectAssignment.findOne({
    institutionId,
    academicYearId,
    teacherId: teacherProfile._id,
    classId,
    sectionId,
    subjectId,
    isActive: true
  });

  if (assignment) {
    return true;
  }

  // Check if teacher is class teacher for the section
  const sectionDoc = await Section.findOne({
    _id: sectionId,
    institutionId,
    classId,
    classTeacherId: teacherProfile._id
  });

  if (sectionDoc) {
    return true;
  }

  return false;
};

/**
 * Resolve student profile IDs and student User IDs linked to a parent user
 */
const getParentLinkedStudentProfileIds = async (parentUserId, institutionId) => {
  const query = { parentId: parentUserId };
  if (institutionId) {
    query.institutionId = institutionId;
  }

  const links = await ParentChildLink.find(query);
  const studentUserIds = links.map((l) => l.studentId);

  const profiles = await StudentProfile.find({
    userId: { $in: studentUserIds }
  });

  const profileIds = profiles.map((p) => p._id.toString());
  const userIds = studentUserIds.map((u) => u.toString());

  return {
    studentProfileIds: profileIds,
    studentUserIds: userIds
  };
};

/**
 * Calculate result summary for a list of student exam marks
 */
const calculateStudentResultSummary = (marksList = [], gradingRules = []) => {
  let totalObtained = 0;
  let totalMax = 0;
  let passedSubjectsCount = 0;
  let failedSubjectsCount = 0;

  marksList.forEach((m) => {
    totalObtained += m.marksObtained || 0;
    totalMax += m.maxMarks || 0;

    const passingMarks = m.passingMarks || 0;
    const isPassed = m.status === 'pass' || (m.status !== 'absent' && m.marksObtained >= passingMarks);

    if (isPassed) {
      passedSubjectsCount += 1;
    } else {
      failedSubjectsCount += 1;
    }
  });

  const percentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
  const grade = calculateGrade(percentage, gradingRules);
  const overallResult = failedSubjectsCount === 0 && marksList.length > 0 ? 'PASS' : 'FAIL';

  return {
    totalObtained,
    totalMax,
    percentage,
    grade,
    passedSubjectsCount,
    failedSubjectsCount,
    overallResult
  };
};

module.exports = {
  getGradingRulesForInstitution,
  calculateGrade,
  verifyTeacherExamSubjectAssignment,
  getParentLinkedStudentProfileIds,
  calculateStudentResultSummary
};
