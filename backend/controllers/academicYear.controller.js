const AcademicYear = require('../models/AcademicYear');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateAcademicYearInput, isValidObjectId } = require('../validations/academicManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create Academic Year
 * @route   POST /api/v1/academic-years
 * @access  Private (Super Admin, Institution Admin)
 */
const createAcademicYear = async (req, res, next) => {
  try {
    const val = validateAcademicYearInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { name, startDate, endDate, status } = req.body;
    const requestedStatus = status || 'upcoming';

    // Duplicate name check in institution
    const existingName = await AcademicYear.findOne({
      institutionId: targetInstitutionId,
      name: name.trim()
    });

    if (existingName) {
      return sendError(res, 400, `Academic year '${name.trim()}' already exists for this institution.`);
    }

    // If requested status is 'active', deactivate/complete any existing active academic year
    if (requestedStatus === 'active') {
      await AcademicYear.updateMany(
        { institutionId: targetInstitutionId, status: 'active' },
        { status: 'completed' }
      );
    }

    const academicYear = await AcademicYear.create({
      institutionId: targetInstitutionId,
      name: name.trim(),
      startDate,
      endDate,
      status: requestedStatus,
      isActive: true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ACADEMIC_YEAR_CREATED',
      institutionId: targetInstitutionId,
      details: { academicYearId: academicYear._id, name: academicYear.name, status: academicYear.status },
      req
    });

    return sendSuccess(res, 201, 'Academic year created successfully.', { academicYear });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Duplicate academic year name for this institution.');
    }
    next(error);
  }
};

/**
 * @desc    Get Academic Years List
 * @route   GET /api/v1/academic-years
 * @access  Private
 */
const getAcademicYears = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.status) {
      filter.status = req.query.status.toLowerCase();
    }

    const academicYears = await AcademicYear.find(filter)
      .populate('institutionId', 'institutionName institutionCode')
      .sort({ startDate: -1 });

    return sendSuccess(res, 200, 'Academic years retrieved successfully.', {
      count: academicYears.length,
      academicYears
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Academic Year
 * @route   GET /api/v1/academic-years/:id
 * @access  Private
 */
const getAcademicYearById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Academic Year ID.');
    }

    const academicYear = await AcademicYear.findById(req.params.id)
      .populate('institutionId', 'institutionName institutionCode');

    if (!academicYear) {
      return sendError(res, 404, 'Academic year not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (academicYear.institutionId._id.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access academic year belonging to another institution.');
      }
    }

    return sendSuccess(res, 200, 'Academic year details retrieved.', { academicYear });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Academic Year
 * @route   PATCH /api/v1/academic-years/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateAcademicYear = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Academic Year ID.');
    }

    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return sendError(res, 404, 'Academic year not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (academicYear.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update academic year belonging to another institution.');
      }
    }

    const { name, startDate, endDate, status, isActive } = req.body;

    if (name && name.trim() !== academicYear.name) {
      const existingName = await AcademicYear.findOne({
        institutionId: academicYear.institutionId,
        name: name.trim(),
        _id: { $ne: academicYear._id }
      });
      if (existingName) {
        return sendError(res, 400, `Academic year '${name.trim()}' already exists for this institution.`);
      }
      academicYear.name = name.trim();
    }

    if (startDate) academicYear.startDate = startDate;
    if (endDate) academicYear.endDate = endDate;

    if (status) {
      if (!['upcoming', 'active', 'completed', 'archived'].includes(status)) {
        return sendError(res, 400, 'Invalid status value.');
      }
      if (status === 'active' && academicYear.status !== 'active') {
        // Enforce single active academic year per institution
        await AcademicYear.updateMany(
          { institutionId: academicYear.institutionId, status: 'active', _id: { $ne: academicYear._id } },
          { status: 'completed' }
        );
      }
      academicYear.status = status;
    }

    if (isActive !== undefined) academicYear.isActive = isActive;
    academicYear.updatedBy = req.user._id;

    await academicYear.save();

    await logAuditEvent({
      actor: req.user,
      action: 'ACADEMIC_YEAR_UPDATED',
      institutionId: academicYear.institutionId,
      details: { academicYearId: academicYear._id, name: academicYear.name, status: academicYear.status },
      req
    });

    return sendSuccess(res, 200, 'Academic year updated successfully.', { academicYear });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Activate Academic Year
 * @route   PATCH /api/v1/academic-years/:id/activate
 * @access  Private (Super Admin, Institution Admin)
 */
const activateAcademicYear = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Academic Year ID.');
    }

    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return sendError(res, 404, 'Academic year not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (academicYear.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot activate academic year belonging to another institution.');
      }
    }

    // Set all other active academic years to completed
    await AcademicYear.updateMany(
      { institutionId: academicYear.institutionId, status: 'active', _id: { $ne: academicYear._id } },
      { status: 'completed' }
    );

    academicYear.status = 'active';
    academicYear.isActive = true;
    academicYear.updatedBy = req.user._id;
    await academicYear.save();

    await logAuditEvent({
      actor: req.user,
      action: 'ACADEMIC_YEAR_ACTIVATED',
      institutionId: academicYear.institutionId,
      details: { academicYearId: academicYear._id, name: academicYear.name },
      req
    });

    return sendSuccess(res, 200, `Academic year '${academicYear.name}' is now active.`, { academicYear });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Archive Academic Year
 * @route   PATCH /api/v1/academic-years/:id/archive
 * @access  Private (Super Admin, Institution Admin)
 */
const archiveAcademicYear = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Academic Year ID.');
    }

    const academicYear = await AcademicYear.findById(req.params.id);

    if (!academicYear) {
      return sendError(res, 404, 'Academic year not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (academicYear.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot archive academic year belonging to another institution.');
      }
    }

    academicYear.status = 'archived';
    academicYear.isActive = false;
    academicYear.updatedBy = req.user._id;
    await academicYear.save();

    await logAuditEvent({
      actor: req.user,
      action: 'ACADEMIC_YEAR_ARCHIVED',
      institutionId: academicYear.institutionId,
      details: { academicYearId: academicYear._id, name: academicYear.name },
      req
    });

    return sendSuccess(res, 200, `Academic year '${academicYear.name}' archived.`, { academicYear });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAcademicYear,
  getAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
  activateAcademicYear,
  archiveAcademicYear
};
