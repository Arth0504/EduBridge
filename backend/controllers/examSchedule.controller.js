const ExamSchedule = require('../models/ExamSchedule');
const Examination = require('../models/Examination');
const Subject = require('../models/Subject');
const ExamMark = require('../models/ExamMark');
const TeacherProfile = require('../models/TeacherProfile');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const Section = require('../models/Section');
const { validateCreateExamScheduleInput, validateUpdateExamScheduleInput } = require('../validations/examSchedule.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create exam schedule entry for a subject
 * @route   POST /api/v1/exam-schedules
 * @access  Private (Super Admin, Institution Admin)
 */
const createExamSchedule = async (req, res) => {
  try {
    const { isValid, errors } = validateCreateExamScheduleInput(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const exam = await Examination.findById(req.body.examinationId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const institutionId = req.user.role === 'super_admin' ? exam.institutionId : req.user.institutionId;

    if (req.user.role !== 'super_admin' && exam.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. Cross-tenant exam schedule creation forbidden.' });
    }

    // Verify subject exists and belongs to institution
    const subject = await Subject.findOne({ _id: req.body.subjectId, institutionId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found for this institution.' });
    }

    // Check duplicate schedule
    const existing = await ExamSchedule.findOne({
      examinationId: req.body.examinationId,
      classId: req.body.classId,
      sectionId: req.body.sectionId,
      subjectId: req.body.subjectId
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This subject is already scheduled for the selected examination, class, and section.'
      });
    }

    const schedule = await ExamSchedule.create({
      examinationId: req.body.examinationId,
      institutionId,
      academicYearId: exam.academicYearId,
      classId: req.body.classId,
      sectionId: req.body.sectionId,
      subjectId: req.body.subjectId,
      examDate: req.body.examDate,
      startTime: req.body.startTime || '09:00',
      endTime: req.body.endTime || '12:00',
      maxMarks: req.body.maxMarks,
      passingMarks: req.body.passingMarks,
      roomNumber: req.body.roomNumber || '',
      instructions: req.body.instructions || '',
      status: req.body.status || 'scheduled'
    });

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_SCHEDULE_CREATED',
      institutionId,
      details: { scheduleId: schedule._id, examinationId: exam._id, subjectId: subject._id },
      req
    });

    const populated = await ExamSchedule.findById(schedule._id)
      .populate('examinationId', 'name examType status')
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('subjectId', 'name code');

    return res.status(201).json({
      success: true,
      message: 'Exam schedule created successfully.',
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get exam schedules
 * @route   GET /api/v1/exam-schedules
 * @access  Private
 */
const getExamSchedules = async (req, res) => {
  try {
    const institutionId = req.user.role === 'super_admin' ? (req.query.institutionId || req.user.institutionId) : req.user.institutionId;

    const filter = {};
    if (institutionId) filter.institutionId = institutionId;
    if (req.query.examinationId) filter.examinationId = req.query.examinationId;
    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    // Role specific restrictions
    if (req.user.role === 'student' || req.user.role === 'parent') {
      // Find published exams only
      const publishedExams = await Examination.find({
        ...(institutionId ? { institutionId } : {}),
        status: 'published'
      }).select('_id');
      const publishedIds = publishedExams.map((e) => e._id);
      
      if (req.query.examinationId) {
        if (!publishedIds.map((id) => id.toString()).includes(req.query.examinationId)) {
          filter.examinationId = null; // Forces empty result if requested exam is not published
        }
      } else {
        filter.examinationId = { $in: publishedIds };
      }
    }

    const schedules = await ExamSchedule.find(filter)
      .populate('examinationId', 'name examType startDate endDate status')
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('subjectId', 'name code type')
      .sort({ examDate: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get exam schedule by ID
 * @route   GET /api/v1/exam-schedules/:id
 * @access  Private
 */
const getExamScheduleById = async (req, res) => {
  try {
    const schedule = await ExamSchedule.findById(req.params.id)
      .populate('examinationId', 'name examType startDate endDate status')
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('subjectId', 'name code type');

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found.' });
    }

    if (req.user.role !== 'super_admin' && schedule.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update exam schedule
 * @route   PATCH /api/v1/exam-schedules/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateExamSchedule = async (req, res) => {
  try {
    const schedule = await ExamSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found.' });
    }

    if (req.user.role !== 'super_admin' && schedule.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { isValid, errors } = validateUpdateExamScheduleInput(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    if (req.body.examDate) schedule.examDate = req.body.examDate;
    if (req.body.startTime) schedule.startTime = req.body.startTime;
    if (req.body.endTime) schedule.endTime = req.body.endTime;
    if (req.body.maxMarks !== undefined) schedule.maxMarks = req.body.maxMarks;
    if (req.body.passingMarks !== undefined) schedule.passingMarks = req.body.passingMarks;
    if (req.body.roomNumber !== undefined) schedule.roomNumber = req.body.roomNumber;
    if (req.body.instructions !== undefined) schedule.instructions = req.body.instructions;
    if (req.body.status) schedule.status = req.body.status;

    await schedule.save();

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_SCHEDULE_UPDATED',
      institutionId: schedule.institutionId,
      details: { scheduleId: schedule._id },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Exam schedule updated successfully.',
      data: schedule
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete exam schedule
 * @route   DELETE /api/v1/exam-schedules/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const deleteExamSchedule = async (req, res) => {
  try {
    const schedule = await ExamSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Exam schedule not found.' });
    }

    if (req.user.role !== 'super_admin' && schedule.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const hasMarks = await ExamMark.exists({ examScheduleId: schedule._id });
    if (hasMarks) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete schedule because exam marks have already been recorded.'
      });
    }

    await ExamSchedule.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_SCHEDULE_DELETED',
      institutionId: schedule.institutionId,
      details: { scheduleId: req.params.id },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Exam schedule deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createExamSchedule,
  getExamSchedules,
  getExamScheduleById,
  updateExamSchedule,
  deleteExamSchedule
};
