const Examination = require('../models/Examination');
const ExamSchedule = require('../models/ExamSchedule');
const ExamMark = require('../models/ExamMark');
const StudentProfile = require('../models/StudentProfile');
const StudentAcademicEnrollment = require('../models/StudentAcademicEnrollment');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const {
  getGradingRulesForInstitution,
  calculateGrade,
  getParentLinkedStudentProfileIds,
  calculateStudentResultSummary
} = require('../services/exam.service');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Publish examination results
 * @route   POST /api/v1/results/publish
 * @access  Private (Super Admin, Institution Admin)
 */
const publishExaminationResults = async (req, res) => {
  try {
    const { examinationId } = req.body;
    if (!examinationId) {
      return res.status(400).json({ success: false, message: 'examinationId is required.' });
    }

    const exam = await Examination.findById(examinationId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    if (req.user.role !== 'super_admin' && exam.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    exam.status = 'published';
    exam.updatedBy = req.user._id;
    await exam.save();

    // Mark all marks for this examination as published
    const publishResult = await ExamMark.updateMany(
      { examinationId: exam._id },
      {
        $set: {
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: req.user._id
        }
      }
    );

    await logAuditEvent({
      actor: req.user,
      action: 'RESULTS_PUBLISHED',
      institutionId: exam.institutionId,
      details: { examinationId: exam._id, examName: exam.name, marksPublishedCount: publishResult.modifiedCount },
      req
    });

    return res.status(200).json({
      success: true,
      message: `Results for examination "${exam.name}" have been published successfully.`,
      marksPublishedCount: publishResult.modifiedCount,
      data: exam
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get detailed result report for a single student
 * @route   GET /api/v1/results/student/:studentId
 * @access  Private
 */
const getStudentResult = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examinationId } = req.query;

    const studentProfile = await StudentProfile.findById(studentId);
    if (!studentProfile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const institutionId = req.user.role === 'super_admin' ? studentProfile.institutionId : req.user.institutionId;

    if (req.user.role !== 'super_admin' && studentProfile.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. Cross-tenant student result forbidden.' });
    }

    // Student role check: student can ONLY view own result
    if (req.user.role === 'student') {
      const ownProfile = await StudentProfile.findOne({ userId: req.user._id });
      if (!ownProfile || ownProfile._id.toString() !== studentId) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view your own result.' });
      }
    }

    // Parent role check: parent can ONLY view linked child result
    if (req.user.role === 'parent') {
      const { studentProfileIds } = await getParentLinkedStudentProfileIds(req.user._id, institutionId);
      if (!studentProfileIds.includes(studentId)) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view results for your linked child.' });
      }
    }

    const markFilter = { studentId: studentProfile._id };
    if (examinationId) markFilter.examinationId = examinationId;

    // Student & parent can only see published marks
    if (req.user.role === 'student' || req.user.role === 'parent') {
      markFilter.isPublished = true;
    }

    const marks = await ExamMark.find(markFilter)
      .populate('examinationId', 'name examType startDate status')
      .populate('subjectId', 'name code type')
      .populate('classId', 'name code')
      .populate('sectionId', 'name code');

    const gradingRules = await getGradingRulesForInstitution(institutionId);
    const summary = calculateStudentResultSummary(marks, gradingRules);

    return res.status(200).json({
      success: true,
      data: {
        student: {
          _id: studentProfile._id,
          firstName: studentProfile.firstName,
          lastName: studentProfile.lastName,
          rollNumber: studentProfile.rollNumber,
          admissionNumber: studentProfile.admissionNumber
        },
        summary,
        subjectMarks: marks
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get class / section result report
 * @route   GET /api/v1/results/class
 * @access  Private (Admin, Teacher)
 */
const getClassResults = async (req, res) => {
  try {
    const { examinationId, classId, sectionId } = req.query;

    if (!examinationId || !classId) {
      return res.status(400).json({ success: false, message: 'examinationId and classId are required.' });
    }

    const exam = await Examination.findById(examinationId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const institutionId = req.user.role === 'super_admin' ? exam.institutionId : req.user.institutionId;

    const filter = { examinationId, classId, institutionId };
    if (sectionId) filter.sectionId = sectionId;

    const marks = await ExamMark.find(filter)
      .populate('studentId', 'firstName lastName rollNumber user')
      .populate('subjectId', 'name code')
      .populate('classId', 'name code')
      .populate('sectionId', 'name code');

    const gradingRules = await getGradingRulesForInstitution(institutionId);

    // Group marks by student
    const studentMap = {};
    marks.forEach((m) => {
      if (!m.studentId) return;
      const sId = m.studentId._id.toString();
      if (!studentMap[sId]) {
        studentMap[sId] = {
          student: m.studentId,
          class: m.classId,
          section: m.sectionId,
          marks: []
        };
      }
      studentMap[sId].marks.push(m);
    });

    const studentResults = Object.values(studentMap).map((item) => {
      const summary = calculateStudentResultSummary(item.marks, gradingRules);
      return {
        student: item.student,
        class: item.class,
        section: item.section,
        summary,
        subjectMarks: item.marks
      };
    });

    // Sort by percentage descending to calculate rank
    studentResults.sort((a, b) => b.summary.percentage - a.summary.percentage);
    studentResults.forEach((resItem, idx) => {
      resItem.summary.rank = idx + 1;
    });

    return res.status(200).json({
      success: true,
      count: studentResults.length,
      data: studentResults
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get subject performance analytics report
 * @route   GET /api/v1/results/reports/subject-performance
 * @access  Private (Admin, Teacher)
 */
const getSubjectPerformanceReport = async (req, res) => {
  try {
    const { examinationId, subjectId, classId, sectionId } = req.query;

    const filter = {};
    if (examinationId) filter.examinationId = examinationId;
    if (subjectId) filter.subjectId = subjectId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;

    const institutionId = req.user.role === 'super_admin' ? (req.query.institutionId || req.user.institutionId) : req.user.institutionId;
    if (institutionId) filter.institutionId = institutionId;

    const marks = await ExamMark.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name code')
      .populate('sectionId', 'name code');

    if (marks.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalStudents: 0,
          averagePercentage: 0,
          highestMark: 0,
          lowestMark: 0,
          passCount: 0,
          failCount: 0,
          passPercentage: 0,
          gradeDistribution: {}
        }
      });
    }

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let highestMark = 0;
    let lowestMark = marks[0].marksObtained;
    let passCount = 0;
    let failCount = 0;
    const gradeDistribution = {};

    marks.forEach((m) => {
      const obt = m.marksObtained || 0;
      totalMarksObtained += obt;
      totalMaxMarks += m.maxMarks || 0;

      if (obt > highestMark) highestMark = obt;
      if (obt < lowestMark) lowestMark = obt;

      if (m.status === 'pass' || obt >= (m.passingMarks || 0)) {
        passCount += 1;
      } else {
        failCount += 1;
      }

      const g = m.grade || 'N/A';
      gradeDistribution[g] = (gradeDistribution[g] || 0) + 1;
    });

    const averagePercentage = totalMaxMarks > 0 ? Number(((totalMarksObtained / totalMaxMarks) * 100).toFixed(2)) : 0;
    const passPercentage = marks.length > 0 ? Number(((passCount / marks.length) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalStudents: marks.length,
        averagePercentage,
        highestMark,
        lowestMark,
        passCount,
        failCount,
        passPercentage,
        gradeDistribution
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get examination summary report
 * @route   GET /api/v1/results/reports/exam-summary
 * @access  Private (Admin, Teacher)
 */
const getExaminationSummary = async (req, res) => {
  try {
    const { examinationId } = req.query;

    if (!examinationId) {
      return res.status(400).json({ success: false, message: 'examinationId is required.' });
    }

    const exam = await Examination.findById(examinationId)
      .populate('academicYearId', 'name year')
      .populate('classes', 'name code');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const marks = await ExamMark.find({ examinationId: exam._id });
    const schedules = await ExamSchedule.find({ examinationId: exam._id });

    const totalScheduledSubjects = schedules.length;
    const totalMarksEntries = marks.length;

    let totalPass = 0;
    let totalFail = 0;
    marks.forEach((m) => {
      if (m.status === 'pass' || m.marksObtained >= m.passingMarks) {
        totalPass += 1;
      } else {
        totalFail += 1;
      }
    });

    const passPercentage = totalMarksEntries > 0 ? Number(((totalPass / totalMarksEntries) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        examination: exam,
        totalScheduledSubjects,
        totalMarksEntries,
        totalPass,
        totalFail,
        passPercentage,
        status: exam.status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  publishExaminationResults,
  getStudentResult,
  getClassResults,
  getSubjectPerformanceReport,
  getExaminationSummary
};
