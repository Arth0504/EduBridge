const Examination = require('../models/Examination');
const ExamSchedule = require('../models/ExamSchedule');
const ExamMark = require('../models/ExamMark');
const AcademicYear = require('../models/AcademicYear');
const { validateCreateExamInput, validateUpdateExamInput } = require('../validations/exam.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create new examination
 * @route   POST /api/v1/examinations
 * @access  Private (Super Admin, Institution Admin)
 */
const createExamination = async (req, res) => {
  try {
    const institutionId = req.user.role === 'super_admin' ? (req.body.institutionId || req.user.institutionId) : req.user.institutionId;

    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'Institution ID is required.' });
    }

    const { isValid, errors } = validateCreateExamInput(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    // Prevent duplicate exam definition within institution and academic year
    const existing = await Examination.findOne({
      institutionId,
      academicYearId: req.body.academicYearId,
      name: { $regex: new RegExp(`^${req.body.name.trim()}$`, 'i') }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An examination with this name already exists for the specified academic year.'
      });
    }

    const exam = await Examination.create({
      institutionId,
      academicYearId: req.body.academicYearId,
      name: req.body.name.trim(),
      examType: req.body.examType || 'unit_test',
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      description: req.body.description || '',
      classes: req.body.classes || [],
      sections: req.body.sections || [],
      status: req.body.status || 'draft',
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_CREATED',
      institutionId,
      details: { examinationId: exam._id, name: exam.name, examType: exam.examType },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Examination created successfully.',
      data: exam
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all examinations
 * @route   GET /api/v1/examinations
 * @access  Private
 */
const getExaminations = async (req, res) => {
  try {
    const institutionId = req.user.role === 'super_admin' ? (req.query.institutionId || req.user.institutionId) : req.user.institutionId;

    const filter = {};
    if (institutionId) {
      filter.institutionId = institutionId;
    }

    if (req.query.academicYearId) {
      filter.academicYearId = req.query.academicYearId;
    }

    if (req.query.examType) {
      filter.examType = req.query.examType;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Role-based filtering
    if (req.user.role === 'student' || req.user.role === 'parent') {
      filter.status = 'published';
    }

    const examinations = await Examination.find(filter)
      .populate('academicYearId', 'year name code startDate endDate')
      .populate('classes', 'name code')
      .populate('sections', 'name code')
      .sort({ startDate: -1 });

    return res.status(200).json({
      success: true,
      count: examinations.length,
      data: examinations
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get examination by ID
 * @route   GET /api/v1/examinations/:id
 * @access  Private
 */
const getExaminationById = async (req, res) => {
  try {
    const exam = await Examination.findById(req.params.id)
      .populate('academicYearId', 'year name code startDate endDate')
      .populate('classes', 'name code')
      .populate('sections', 'name code');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    // Tenant check
    if (req.user.role !== 'super_admin' && exam.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. Cross-tenant access forbidden.' });
    }

    // Student & parent check
    if ((req.user.role === 'student' || req.user.role === 'parent') && exam.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Results for this examination have not been published.' });
    }

    return res.status(200).json({
      success: true,
      data: exam
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update examination
 * @route   PATCH /api/v1/examinations/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateExamination = async (req, res) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    // Tenant check
    if (req.user.role !== 'super_admin' && exam.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { isValid, errors } = validateUpdateExamInput(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    if (req.body.name) exam.name = req.body.name.trim();
    if (req.body.examType) exam.examType = req.body.examType;
    if (req.body.startDate) exam.startDate = req.body.startDate;
    if (req.body.endDate) exam.endDate = req.body.endDate;
    if (req.body.description !== undefined) exam.description = req.body.description;
    if (req.body.classes) exam.classes = req.body.classes;
    if (req.body.sections) exam.sections = req.body.sections;
    if (req.body.status) exam.status = req.body.status;
    exam.updatedBy = req.user._id;

    await exam.save();

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_UPDATED',
      institutionId: exam.institutionId,
      details: { examinationId: exam._id, name: exam.name, status: exam.status },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Examination updated successfully.',
      data: exam
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update examination status (Workflow transition)
 * @route   PATCH /api/v1/examinations/:id/status
 * @access  Private (Super Admin, Institution Admin)
 */
const updateExaminationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'scheduled', 'ongoing', 'completed', 'published', 'archived'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    // Tenant check
    if (req.user.role !== 'super_admin' && exam.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    exam.status = status;
    exam.updatedBy = req.user._id;
    await exam.save();

    // If published, update all associated marks to isPublished: true
    if (status === 'published') {
      await ExamMark.updateMany(
        { examinationId: exam._id },
        {
          $set: {
            isPublished: true,
            publishedAt: new Date(),
            publishedBy: req.user._id
          }
        }
      );
    }

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_STATUS_UPDATED',
      institutionId: exam.institutionId,
      details: { examinationId: exam._id, status },
      req
    });

    return res.status(200).json({
      success: true,
      message: `Examination status updated to ${status}.`,
      data: exam
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete or Archive examination
 * @route   DELETE /api/v1/examinations/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const deleteExamination = async (req, res) => {
  try {
    const exam = await Examination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    if (req.user.role !== 'super_admin' && exam.institutionId.toString() !== req.user.institutionId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const hasMarks = await ExamMark.exists({ examinationId: exam._id });
    if (hasMarks) {
      // Historical data must never be deleted - archive instead
      exam.status = 'archived';
      await exam.save();
      return res.status(200).json({
        success: true,
        message: 'Examination has recorded marks and was archived instead of deleted.',
        data: exam
      });
    }

    await ExamSchedule.deleteMany({ examinationId: exam._id });
    await Examination.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'EXAM_DELETED',
      institutionId: exam.institutionId,
      details: { examinationId: exam._id, name: exam.name },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Examination deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createExamination,
  getExaminations,
  getExaminationById,
  updateExamination,
  updateExaminationStatus,
  deleteExamination
};
