const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const TeacherProfile = require('../models/TeacherProfile');
const StudentProfile = require('../models/StudentProfile');
const StudentAcademicEnrollment = require('../models/StudentAcademicEnrollment');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * @desc    Get Academic Dashboard / Summary Data
 * @route   GET /api/v1/academic/summary
 * @access  Private (Super Admin, Institution Admin)
 */
const getAcademicSummary = async (req, res, next) => {
  try {
    let institutionId = null;

    if (req.user.role === 'super_admin') {
      institutionId = req.query.institutionId || req.headers['x-institution-id'];
      if (!institutionId || institutionId === 'global') {
        // If super admin hasn't passed institutionId, find first active academic year or first institution
        const firstActive = await AcademicYear.findOne({ status: 'active', isActive: true });
        if (firstActive) {
          institutionId = firstActive.institutionId.toString();
        }
      }
    } else {
      institutionId = req.user.institutionId?.toString();
    }

    const instFilter = institutionId ? { institutionId } : {};

    // 1. Active Academic Year
    const activeAcademicYear = await AcademicYear.findOne({
      ...instFilter,
      status: 'active',
      isActive: true
    });

    const activeAcademicYearId = activeAcademicYear ? activeAcademicYear._id : null;

    // 2. Counts
    const classFilter = { ...instFilter, isActive: true };
    if (activeAcademicYearId) classFilter.academicYearId = activeAcademicYearId;

    const sectionFilter = { ...instFilter, isActive: true };
    if (activeAcademicYearId) sectionFilter.academicYearId = activeAcademicYearId;

    const subjectFilter = { ...instFilter, isActive: true };
    if (activeAcademicYearId) subjectFilter.academicYearId = activeAcademicYearId;

    const [totalClasses, totalSections, totalSubjects, totalTeachers, totalStudents] = await Promise.all([
      Class.countDocuments(classFilter),
      Section.countDocuments(sectionFilter),
      Subject.countDocuments(subjectFilter),
      TeacherProfile.countDocuments({ ...instFilter, status: 'active' }),
      StudentProfile.countDocuments({ ...instFilter, status: 'active' })
    ]);

    // 3. Students without class / section enrollment for active academic year
    let studentsWithoutClass = 0;
    if (activeAcademicYearId && institutionId) {
      const allActiveStudents = await StudentProfile.find({ institutionId, status: 'active' }).select('_id');
      const allActiveStudentIds = allActiveStudents.map(s => s._id);

      const enrolledStudentIds = await StudentAcademicEnrollment.distinct('studentId', {
        institutionId,
        academicYearId: activeAcademicYearId,
        enrollmentStatus: 'active'
      });

      const enrolledSet = new Set(enrolledStudentIds.map(id => id.toString()));
      studentsWithoutClass = allActiveStudentIds.filter(id => !enrolledSet.has(id.toString())).length;
    }

    // 4. Teachers without subject assignment for active academic year
    let teachersWithoutSubject = 0;
    if (activeAcademicYearId && institutionId) {
      const allActiveTeachers = await TeacherProfile.find({ institutionId, status: 'active' }).select('_id');
      const allActiveTeacherIds = allActiveTeachers.map(t => t._id);

      const assignedTeacherIds = await TeacherSubjectAssignment.distinct('teacherId', {
        institutionId,
        academicYearId: activeAcademicYearId,
        isActive: true
      });

      const assignedSet = new Set(assignedTeacherIds.map(id => id.toString()));
      teachersWithoutSubject = allActiveTeacherIds.filter(id => !assignedSet.has(id.toString())).length;
    }

    // 5. Recent academic changes (audit logs)
    const academicActionTypes = [
      'ACADEMIC_YEAR_CREATED', 'ACADEMIC_YEAR_UPDATED', 'ACADEMIC_YEAR_ACTIVATED', 'ACADEMIC_YEAR_ARCHIVED',
      'CLASS_CREATED', 'CLASS_UPDATED', 'CLASS_DEACTIVATED',
      'SECTION_CREATED', 'SECTION_UPDATED', 'SECTION_DEACTIVATED',
      'SUBJECT_CREATED', 'SUBJECT_UPDATED', 'SUBJECT_DEACTIVATED',
      'TEACHER_ASSIGNMENT_CREATED', 'TEACHER_ASSIGNMENT_UPDATED', 'TEACHER_ASSIGNMENT_REMOVED',
      'STUDENT_ENROLLMENT_CREATED', 'STUDENT_ENROLLMENT_UPDATED', 'STUDENT_ENROLLMENT_TRANSFERRED'
    ];

    const auditFilter = { action: { $in: academicActionTypes } };
    if (institutionId) auditFilter.institutionId = institutionId;

    const recentAcademicChanges = await AuditLog.find(auditFilter)
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(10);

    return sendSuccess(res, 200, 'Academic summary retrieved successfully.', {
      summary: {
        activeAcademicYear,
        totalClasses,
        totalSections,
        totalSubjects,
        totalTeachers,
        totalStudents,
        studentsWithoutClass,
        teachersWithoutSubject,
        recentAcademicChanges
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAcademicSummary };
