const TimeSlot = require('../models/TimeSlot');
const AcademicYear = require('../models/AcademicYear');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateTimeSlotInput, isValidObjectId } = require('../validations/timeSlot.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create Time Slot
 * @route   POST /api/v1/time-slots
 * @access  Private (Super Admin, Institution Admin)
 */
const createTimeSlot = async (req, res, next) => {
  try {
    const val = validateTimeSlotInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? (req.body.institutionId || req.user.institutionId) : req.user.institutionId;
    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { academicYearId, periodNumber, periodName, startTime, endTime, type } = req.body;

    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear) {
      return sendError(res, 404, 'Academic year not found.');
    }
    if (academicYear.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Academic year belongs to a different institution.');
    }

    const existing = await TimeSlot.findOne({
      institutionId: targetInstitutionId,
      academicYearId,
      periodNumber
    });

    if (existing) {
      return sendError(res, 400, `Period number ${periodNumber} already exists for this academic year.`);
    }

    const timeSlot = await TimeSlot.create({
      institutionId: targetInstitutionId,
      academicYearId,
      periodNumber,
      periodName: periodName || `Period ${periodNumber}`,
      startTime,
      endTime,
      type: type || 'lecture',
      isActive: true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'TIME_SLOT_CREATED',
      institutionId: targetInstitutionId,
      details: { timeSlotId: timeSlot._id, periodNumber, startTime, endTime },
      req
    });

    return sendSuccess(res, 201, 'Time slot created successfully.', { timeSlot });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Duplicate period number for this institution and academic year.');
    }
    next(error);
  }
};

/**
 * @desc    Get Time Slots
 * @route   GET /api/v1/time-slots
 * @access  Private
 */
const getTimeSlots = async (req, res, next) => {
  try {
    const filter = {};
    const targetInstitutionId = req.user.role === 'super_admin' ? (req.query.institutionId || req.user.institutionId) : req.user.institutionId;
    if (targetInstitutionId) filter.institutionId = targetInstitutionId;

    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const timeSlots = await TimeSlot.find(filter)
      .populate('academicYearId', 'name status')
      .sort({ periodNumber: 1 });

    return sendSuccess(res, 200, 'Time slots retrieved successfully.', {
      count: timeSlots.length,
      timeSlots
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Time Slot by ID
 * @route   GET /api/v1/time-slots/:id
 * @access  Private
 */
const getTimeSlotById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Time Slot ID.');
    }

    const timeSlot = await TimeSlot.findById(req.params.id).populate('academicYearId', 'name status');
    if (!timeSlot) {
      return sendError(res, 404, 'Time slot not found.');
    }

    if (req.user.role !== 'super_admin' && timeSlot.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot access time slot from another institution.');
    }

    return sendSuccess(res, 200, 'Time slot retrieved.', { timeSlot });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Time Slot
 * @route   PATCH /api/v1/time-slots/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateTimeSlot = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Time Slot ID.');
    }

    const timeSlot = await TimeSlot.findById(req.params.id);
    if (!timeSlot) {
      return sendError(res, 404, 'Time slot not found.');
    }

    if (req.user.role !== 'super_admin' && timeSlot.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot update time slot for another institution.');
    }

    const { periodName, startTime, endTime, type, isActive } = req.body;
    if (periodName !== undefined) timeSlot.periodName = periodName;
    if (startTime !== undefined) timeSlot.startTime = startTime;
    if (endTime !== undefined) timeSlot.endTime = endTime;
    if (type !== undefined) timeSlot.type = type;
    if (isActive !== undefined) timeSlot.isActive = isActive;
    timeSlot.updatedBy = req.user._id;

    await timeSlot.save();

    await logAuditEvent({
      actor: req.user,
      action: 'TIME_SLOT_UPDATED',
      institutionId: timeSlot.institutionId,
      details: { timeSlotId: timeSlot._id, periodNumber: timeSlot.periodNumber },
      req
    });

    return sendSuccess(res, 200, 'Time slot updated successfully.', { timeSlot });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Deactivate Time Slot
 * @route   DELETE /api/v1/time-slots/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const deleteTimeSlot = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Time Slot ID.');
    }

    const timeSlot = await TimeSlot.findById(req.params.id);
    if (!timeSlot) {
      return sendError(res, 404, 'Time slot not found.');
    }

    if (req.user.role !== 'super_admin' && timeSlot.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot delete time slot for another institution.');
    }

    timeSlot.isActive = false;
    timeSlot.updatedBy = req.user._id;
    await timeSlot.save();

    await logAuditEvent({
      actor: req.user,
      action: 'TIME_SLOT_UPDATED',
      institutionId: timeSlot.institutionId,
      details: { timeSlotId: timeSlot._id, action: 'deactivated' },
      req
    });

    return sendSuccess(res, 200, 'Time slot deactivated successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTimeSlot,
  getTimeSlots,
  getTimeSlotById,
  updateTimeSlot,
  deleteTimeSlot
};
