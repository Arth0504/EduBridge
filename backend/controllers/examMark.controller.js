const ExamMark = require('../models/ExamMark');
const ExamSchedule = require('../models/ExamSchedule');
const Examination = require('../models/Examination');
const StudentProfile = require('../models/StudentProfile');
const StudentAcademicEnrollment = require('../models/StudentAcademicEnrollment');
const {
  getGradingRulesForInstitution,
  calculateGrade,
  verifyTeacherExamSubjectAssignment,
  getParentLinkedStudentProfileIds
} = require('../services/exam.service');
const {
  validateSingleMarkInput,
  validateBulkMarkInput,
  validateMarkCorrectionInput
} = require('../validations/examMark.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Record or update single mark entry
 * @route   POST /api/v1/exam-marks
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const createOrUpdateSingleExamMark = async (req, res) => {
  try {
    const { examinationId, examScheduleId, studentId, marksObtained, remarks, status: inputStatus } = req.body;

    const schedule = await ExamSchedule.findById(examScheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found.' });
    }

    const exam = await Examination.findById(examinationId || schedule.examinationId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const institutionId = req.user.role === 'super_admin' ? exam.institutionId : req.user.institutionId;

    if (req.user.role !== 'super_admin' && exam.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. Cross-tenant marks entry forbidden.' });
    }

    // Teacher authorization verification
    const isAuthorized = await verifyTeacherExamSubjectAssignment(
      req.user,
      institutionId,
      schedule.academicYearId,
      schedule.classId,
      schedule.sectionId,
      schedule.subjectId
    );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not assigned to teach this subject/class/section.'
      });
    }

    const { isValid, errors } = validateSingleMarkInput(req.body, schedule.maxMarks);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    // Verify student profile belongs to institution & enrollment
    const student = await StudentProfile.findById(studentId);
    if (!student || student.institutionId.toString() !== institutionId.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid student or student belongs to another institution.' });
    }

    // Check existing mark record
    const existingMark = await ExamMark.findOne({
      examinationId: exam._id,
      examScheduleId: schedule._id,
      studentId: student._id
    });

    if (existingMark && existingMark.isPublished) {
      if (!req.body.correctionReason || req.body.correctionReason.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Published marks cannot be modified without providing a correctionReason.'
        });
      }
    }

    // Calculate Grade & Pass/Fail status
    const gradingRules = await getGradingRulesForInstitution(institutionId);
    const percentage = ((marksObtained / schedule.maxMarks) * 100);
    const calculatedGrade = calculateGrade(percentage, gradingRules);
    const passStatus = inputStatus || (marksObtained >= schedule.passingMarks ? 'pass' : 'fail');

    let markDoc;
    if (existingMark) {
      existingMark.marksObtained = marksObtained;
      existingMark.maxMarks = schedule.maxMarks;
      existingMark.passingMarks = schedule.passingMarks;
      existingMark.grade = calculatedGrade;
      existingMark.status = passStatus;
      existingMark.remarks = remarks || existingMark.remarks;
      existingMark.enteredBy = req.user._id;
      existingMark.enteredByRole = req.user.role;
      if (req.body.correctionReason) {
        existingMark.correctionReason = req.body.correctionReason;
      }
      markDoc = await existingMark.save();
    } else {
      markDoc = await ExamMark.create({
        examinationId: exam._id,
        examScheduleId: schedule._id,
        institutionId,
        academicYearId: schedule.academicYearId,
        classId: schedule.classId,
        sectionId: schedule.sectionId,
        subjectId: schedule.subjectId,
        studentId: student._id,
        marksObtained,
        maxMarks: schedule.maxMarks,
        passingMarks: schedule.passingMarks,
        grade: calculatedGrade,
        status: passStatus,
        remarks: remarks || '',
        enteredBy: req.user._id,
        enteredByRole: req.user.role,
        isPublished: exam.status === 'published'
      });
    }

    await logAuditEvent({
      actor: req.user,
      action: existingMark ? 'EXAM_MARK_UPDATED' : 'EXAM_MARK_CREATED',
      institutionId,
      details: { markId: markDoc._id, studentId: student._id, marksObtained, grade: calculatedGrade },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Exam mark recorded successfully.',
      data: markDoc
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Bulk record marks for a class/section/subject schedule
 * @route   POST /api/v1/exam-marks/bulk
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const bulkCreateOrUpdateExamMarks = async (req, res) => {
  try {
    const { examinationId, examScheduleId, marks } = req.body;

    const schedule = await ExamSchedule.findById(examScheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found.' });
    }

    const exam = await Examination.findById(examinationId || schedule.examinationId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const institutionId = req.user.role === 'super_admin' ? exam.institutionId : req.user.institutionId;

    if (req.user.role !== 'super_admin' && exam.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. Cross-tenant bulk marks entry forbidden.' });
    }

    // Verify teacher assignment for subject/class/section
    const isAuthorized = await verifyTeacherExamSubjectAssignment(
      req.user,
      institutionId,
      schedule.academicYearId,
      schedule.classId,
      schedule.sectionId,
      schedule.subjectId
    );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not assigned to teach this subject/class/section.'
      });
    }

    const { isValid, errors } = validateBulkMarkInput(req.body, schedule.maxMarks);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const gradingRules = await getGradingRulesForInstitution(institutionId);
    const savedRecords = [];
    const validationErrors = [];

    for (const [idx, entry] of marks.entries()) {
      const student = await StudentProfile.findById(entry.studentId);
      if (!student || student.institutionId.toString() !== institutionId.toString()) {
        validationErrors.push(`Student [${idx}] does not belong to this institution.`);
        continue;
      }

      if (entry.marksObtained < 0) {
        validationErrors.push(`Student [${idx}] marks cannot be negative.`);
        continue;
      }

      if (entry.marksObtained > schedule.maxMarks) {
        validationErrors.push(`Student [${idx}] marksObtained (${entry.marksObtained}) exceeds maxMarks (${schedule.maxMarks}).`);
        continue;
      }

      const existingMark = await ExamMark.findOne({
        examinationId: exam._id,
        examScheduleId: schedule._id,
        studentId: student._id
      });

      if (existingMark && existingMark.isPublished && (!entry.correctionReason || entry.correctionReason.trim() === '')) {
        validationErrors.push(`Student [${idx}] mark is published. correctionReason required to modify.`);
        continue;
      }

      const percentage = ((entry.marksObtained / schedule.maxMarks) * 100);
      const calculatedGrade = calculateGrade(percentage, gradingRules);
      const passStatus = entry.status || (entry.marksObtained >= schedule.passingMarks ? 'pass' : 'fail');

      let markDoc;
      if (existingMark) {
        existingMark.marksObtained = entry.marksObtained;
        existingMark.maxMarks = schedule.maxMarks;
        existingMark.passingMarks = schedule.passingMarks;
        existingMark.grade = calculatedGrade;
        existingMark.status = passStatus;
        existingMark.remarks = entry.remarks || existingMark.remarks;
        existingMark.enteredBy = req.user._id;
        existingMark.enteredByRole = req.user.role;
        if (entry.correctionReason) {
          existingMark.correctionReason = entry.correctionReason;
        }
        markDoc = await existingMark.save();
      } else {
        markDoc = await ExamMark.create({
          examinationId: exam._id,
          examScheduleId: schedule._id,
          institutionId,
          academicYearId: schedule.academicYearId,
          classId: schedule.classId,
          sectionId: schedule.sectionId,
          subjectId: schedule.subjectId,
          studentId: student._id,
          marksObtained: entry.marksObtained,
          maxMarks: schedule.maxMarks,
          passingMarks: schedule.passingMarks,
          grade: calculatedGrade,
          status: passStatus,
          remarks: entry.remarks || '',
          enteredBy: req.user._id,
          enteredByRole: req.user.role,
          isPublished: exam.status === 'published'
        });
      }

      savedRecords.push(markDoc);
    }

    if (validationErrors.length > 0 && savedRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bulk marks entry failed completely due to validation errors.',
        errors: validationErrors
      });
    }

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_MARKS_BULK_RECORDED',
      institutionId,
      details: { examinationId: exam._id, scheduleId: schedule._id, recordsSaved: savedRecords.length },
      req
    });

    return res.status(200).json({
      success: true,
      message: `Bulk marks recorded successfully (${savedRecords.length} records).`,
      savedCount: savedRecords.length,
      errors: validationErrors,
      data: savedRecords
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get exam marks based on query and role
 * @route   GET /api/v1/exam-marks
 * @access  Private
 */
const getExamMarks = async (req, res) => {
  try {
    const institutionId = req.user.role === 'super_admin' ? (req.query.institutionId || req.user.institutionId) : req.user.institutionId;

    const filter = {};
    if (institutionId) filter.institutionId = institutionId;
    if (req.query.examinationId) filter.examinationId = req.query.examinationId;
    if (req.query.examScheduleId) filter.examScheduleId = req.query.examScheduleId;
    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.studentId) filter.studentId = req.query.studentId;

    // Student Access Rule: Students can ONLY view their own published results
    if (req.user.role === 'student') {
      const studentProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId });
      if (!studentProfile) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter.studentId = studentProfile._id;
      filter.isPublished = true;
    }

    // Parent Access Rule: Parents can ONLY view published results for linked children
    if (req.user.role === 'parent') {
      const { studentProfileIds } = await getParentLinkedStudentProfileIds(req.user._id, institutionId);
      if (req.query.studentId) {
        if (!studentProfileIds.includes(req.query.studentId.toString())) {
          return res.status(403).json({ success: false, message: 'Access denied. Unlinked child results forbidden.' });
        }
        filter.studentId = req.query.studentId;
      } else {
        filter.studentId = { $in: studentProfileIds };
      }
      filter.isPublished = true;
    }

    // Teacher Access Rule: Teacher can only view marks for authorized subjects/classes/sections
    if (req.user.role === 'teacher' && req.query.subjectId && req.query.classId && req.query.sectionId) {
      const isAuthorized = await verifyTeacherExamSubjectAssignment(
        req.user,
        institutionId,
        req.query.academicYearId || null,
        req.query.classId,
        req.query.sectionId,
        req.query.subjectId
      );
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view marks for this subject/class/section.'
        });
      }
    }

    const marks = await ExamMark.find(filter)
      .populate('examinationId', 'name examType status')
      .populate('examScheduleId', 'examDate startTime maxMarks passingMarks')
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('subjectId', 'name code type')
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber user',
        populate: { path: 'userId', select: 'firstName lastName email' }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: marks.length,
      data: marks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update mark entry with correction reason
 * @route   PATCH /api/v1/exam-marks/:id/correction
 * @access  Private (Super Admin, Institution Admin, Teacher)
 */
const updateExamMarkCorrection = async (req, res) => {
  try {
    const mark = await ExamMark.findById(req.params.id);
    if (!mark) {
      return res.status(404).json({ success: false, message: 'Exam mark record not found.' });
    }

    if (req.user.role !== 'super_admin' && mark.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { isValid, errors } = validateMarkCorrectionInput(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const isAuthorized = await verifyTeacherExamSubjectAssignment(
      req.user,
      mark.institutionId,
      mark.academicYearId,
      mark.classId,
      mark.sectionId,
      mark.subjectId
    );

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to modify marks for this subject.' });
    }

    const previousMarks = mark.marksObtained;
    const newMarks = req.body.marksObtained !== undefined ? req.body.marksObtained : mark.marksObtained;

    if (newMarks > mark.maxMarks) {
      return res.status(400).json({ success: false, message: `marksObtained cannot exceed maxMarks (${mark.maxMarks}).` });
    }

    const gradingRules = await getGradingRulesForInstitution(mark.institutionId);
    const percentage = ((newMarks / mark.maxMarks) * 100);
    const calculatedGrade = calculateGrade(percentage, gradingRules);

    mark.marksObtained = newMarks;
    mark.grade = calculatedGrade;
    mark.status = req.body.status || (newMarks >= mark.passingMarks ? 'pass' : 'fail');
    mark.remarks = req.body.remarks || mark.remarks;
    mark.correctionReason = req.body.correctionReason;
    mark.enteredBy = req.user._id;

    await mark.save();

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_MARK_CORRECTED',
      institutionId: mark.institutionId,
      details: {
        markId: mark._id,
        previousMarks,
        newMarks,
        reason: req.body.correctionReason
      },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Exam mark corrected successfully.',
      data: mark
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrUpdateSingleExamMark,
  bulkCreateOrUpdateExamMarks,
  getExamMarks,
  updateExamMarkCorrection
};
