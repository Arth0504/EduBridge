const Class = require('../models/Class');
const AcademicYear = require('../models/AcademicYear');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateClassInput, isValidObjectId } = require('../validations/academicManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create Class
 * @route   POST /api/v1/classes
 * @access  Private (Super Admin, Institution Admin)
 */
const createClass = async (req, res, next) => {
  try {
    const val = validateClassInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { academicYearId, name, displayName, description, classOrder } = req.body;

    // Verify academic year exists and belongs to target institution
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      return sendError(res, 404, 'Referenced academic year not found.');
    }
    if (academicYear.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Academic year does not belong to your institution.');
    }

    // Duplicate check for name in institution + academicYear
    const existingClass = await Class.findOne({
      institutionId: targetInstitutionId,
      academicYearId,
      name: name.trim()
    });

    if (existingClass) {
      return sendError(res, 400, `Class '${name.trim()}' already exists in this academic year.`);
    }

    const newClass = await Class.create({
      institutionId: targetInstitutionId,
      academicYearId,
      name: name.trim(),
      displayName: displayName ? displayName.trim() : name.trim(),
      description: description ? description.trim() : '',
      classOrder: classOrder !== undefined ? Number(classOrder) : 0,
      isActive: true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'CLASS_CREATED',
      institutionId: targetInstitutionId,
      details: { classId: newClass._id, name: newClass.name, academicYearId },
      req
    });

    return sendSuccess(res, 201, 'Class created successfully.', { class: newClass });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Duplicate class name for this institution and academic year.');
    }
    next(error);
  }
};

/**
 * @desc    Get Classes List
 * @route   GET /api/v1/classes
 * @access  Private
 */
const getClasses = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const classes = await Class.find(filter)
      .populate('academicYearId', 'name status')
      .populate('institutionId', 'institutionName institutionCode')
      .sort({ classOrder: 1, name: 1 });

    return sendSuccess(res, 200, 'Classes retrieved successfully.', {
      count: classes.length,
      classes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Class
 * @route   GET /api/v1/classes/:id
 * @access  Private
 */
const getClassById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Class ID.');
    }

    const singleClass = await Class.findById(req.params.id)
      .populate('academicYearId', 'name status')
      .populate('institutionId', 'institutionName institutionCode');

    if (!singleClass) {
      return sendError(res, 404, 'Class not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (singleClass.institutionId._id.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access class belonging to another institution.');
      }
    }

    return sendSuccess(res, 200, 'Class details retrieved.', { class: singleClass });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Class
 * @route   PATCH /api/v1/classes/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateClass = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Class ID.');
    }

    const singleClass = await Class.findById(req.params.id);

    if (!singleClass) {
      return sendError(res, 404, 'Class not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (singleClass.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update class belonging to another institution.');
      }
    }

    const { name, displayName, description, classOrder, isActive } = req.body;

    if (name && name.trim() !== singleClass.name) {
      const existingClass = await Class.findOne({
        institutionId: singleClass.institutionId,
        academicYearId: singleClass.academicYearId,
        name: name.trim(),
        _id: { $ne: singleClass._id }
      });
      if (existingClass) {
        return sendError(res, 400, `Class '${name.trim()}' already exists in this academic year.`);
      }
      singleClass.name = name.trim();
    }

    if (displayName !== undefined) singleClass.displayName = displayName.trim();
    if (description !== undefined) singleClass.description = description.trim();
    if (classOrder !== undefined) singleClass.classOrder = Number(classOrder);
    if (isActive !== undefined) singleClass.isActive = isActive;
    singleClass.updatedBy = req.user._id;

    await singleClass.save();

    await logAuditEvent({
      actor: req.user,
      action: 'CLASS_UPDATED',
      institutionId: singleClass.institutionId,
      details: { classId: singleClass._id, name: singleClass.name },
      req
    });

    return sendSuccess(res, 200, 'Class updated successfully.', { class: singleClass });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate Class
 * @route   PATCH /api/v1/classes/:id/deactivate
 * @access  Private (Super Admin, Institution Admin)
 */
const deactivateClass = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Class ID.');
    }

    const singleClass = await Class.findById(req.params.id);

    if (!singleClass) {
      return sendError(res, 404, 'Class not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (singleClass.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot deactivate class belonging to another institution.');
      }
    }

    singleClass.isActive = false;
    singleClass.updatedBy = req.user._id;
    await singleClass.save();

    await logAuditEvent({
      actor: req.user,
      action: 'CLASS_DEACTIVATED',
      institutionId: singleClass.institutionId,
      details: { classId: singleClass._id, name: singleClass.name },
      req
    });

    return sendSuccess(res, 200, `Class '${singleClass.name}' deactivated successfully.`, { class: singleClass });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deactivateClass
};
