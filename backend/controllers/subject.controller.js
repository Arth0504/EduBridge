const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateSubjectInput, isValidObjectId } = require('../validations/academicManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create Subject
 * @route   POST /api/v1/subjects
 * @access  Private (Super Admin, Institution Admin)
 */
const createSubject = async (req, res, next) => {
  try {
    const val = validateSubjectInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { academicYearId, name, subjectCode, description, subjectType, credits } = req.body;

    // Verify academic year exists and belongs to target institution
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      return sendError(res, 404, 'Referenced academic year not found.');
    }
    if (academicYear.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Academic year does not belong to your institution.');
    }

    // Duplicate subjectCode check within institution
    const existingCode = await Subject.findOne({
      institutionId: targetInstitutionId,
      subjectCode: subjectCode.trim().toUpperCase()
    });

    if (existingCode) {
      return sendError(res, 400, `Subject code '${subjectCode.trim().toUpperCase()}' already exists in this institution.`);
    }

    const subject = await Subject.create({
      institutionId: targetInstitutionId,
      academicYearId,
      name: name.trim(),
      subjectCode: subjectCode.trim().toUpperCase(),
      description: description ? description.trim() : '',
      subjectType: subjectType || 'core',
      credits: credits !== undefined ? Number(credits) : 0,
      isActive: true
    });

    await logAuditEvent({
      actor: req.user,
      action: 'SUBJECT_CREATED',
      institutionId: targetInstitutionId,
      details: { subjectId: subject._id, name: subject.name, subjectCode: subject.subjectCode },
      req
    });

    return sendSuccess(res, 201, 'Subject created successfully.', { subject });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Duplicate subject code within institution.');
    }
    next(error);
  }
};

/**
 * @desc    Get Subjects List
 * @route   GET /api/v1/subjects
 * @access  Private
 */
const getSubjects = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.subjectType) filter.subjectType = req.query.subjectType.toLowerCase();
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const subjects = await Subject.find(filter)
      .populate('academicYearId', 'name status')
      .populate('institutionId', 'institutionName institutionCode')
      .sort({ name: 1 });

    return sendSuccess(res, 200, 'Subjects retrieved successfully.', {
      count: subjects.length,
      subjects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Subject
 * @route   GET /api/v1/subjects/:id
 * @access  Private
 */
const getSubjectById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Subject ID.');
    }

    const subject = await Subject.findById(req.params.id)
      .populate('academicYearId', 'name status')
      .populate('institutionId', 'institutionName institutionCode');

    if (!subject) {
      return sendError(res, 404, 'Subject not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (subject.institutionId._id.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access subject belonging to another institution.');
      }
    }

    return sendSuccess(res, 200, 'Subject details retrieved.', { subject });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Subject
 * @route   PATCH /api/v1/subjects/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateSubject = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Subject ID.');
    }

    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return sendError(res, 404, 'Subject not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (subject.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update subject belonging to another institution.');
      }
    }

    const { name, subjectCode, description, subjectType, credits, isActive } = req.body;

    if (subjectCode && subjectCode.trim().toUpperCase() !== subject.subjectCode) {
      const existingCode = await Subject.findOne({
        institutionId: subject.institutionId,
        subjectCode: subjectCode.trim().toUpperCase(),
        _id: { $ne: subject._id }
      });
      if (existingCode) {
        return sendError(res, 400, `Subject code '${subjectCode.trim().toUpperCase()}' already exists in this institution.`);
      }
      subject.subjectCode = subjectCode.trim().toUpperCase();
    }

    if (name !== undefined) subject.name = name.trim();
    if (description !== undefined) subject.description = description.trim();
    if (subjectType !== undefined) {
      if (!['core', 'elective', 'practical', 'language', 'other'].includes(subjectType)) {
        return sendError(res, 400, 'Invalid subjectType value.');
      }
      subject.subjectType = subjectType;
    }
    if (credits !== undefined) subject.credits = Number(credits);
    if (isActive !== undefined) subject.isActive = isActive;

    await subject.save();

    await logAuditEvent({
      actor: req.user,
      action: 'SUBJECT_UPDATED',
      institutionId: subject.institutionId,
      details: { subjectId: subject._id, name: subject.name, subjectCode: subject.subjectCode },
      req
    });

    return sendSuccess(res, 200, 'Subject updated successfully.', { subject });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate Subject
 * @route   PATCH /api/v1/subjects/:id/deactivate
 * @access  Private (Super Admin, Institution Admin)
 */
const deactivateSubject = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Subject ID.');
    }

    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return sendError(res, 404, 'Subject not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (subject.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot deactivate subject belonging to another institution.');
      }
    }

    subject.isActive = false;
    await subject.save();

    await logAuditEvent({
      actor: req.user,
      action: 'SUBJECT_DEACTIVATED',
      institutionId: subject.institutionId,
      details: { subjectId: subject._id, name: subject.name, subjectCode: subject.subjectCode },
      req
    });

    return sendSuccess(res, 200, `Subject '${subject.name}' deactivated.`, { subject });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deactivateSubject
};
