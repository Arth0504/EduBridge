const FeeStructure = require('../models/FeeStructure');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logAuditEvent } = require('../utils/auditLogger');
const { validateFeeStructureInput, isValidObjectId } = require('../validations/fee.validation');

/**
 * @desc    Create Fee Structure
 * @route   POST /api/v1/fee-structures
 * @access  Private (Super Admin, Institution Admin)
 */
const createFeeStructure = async (req, res, next) => {
  try {
    const val = validateFeeStructureInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;
    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { academicYearId, classId, name, description, components } = req.body;

    // Check for duplicate structure name in institution + academic year
    const existing = await FeeStructure.findOne({
      institutionId: targetInstitutionId,
      academicYearId,
      name: name.trim()
    });
    if (existing) {
      return sendError(res, 400, `Fee structure with name '${name.trim()}' already exists for this academic year.`);
    }

    // Calculate total amount from components
    const totalAmount = components.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const feeStructure = await FeeStructure.create({
      institutionId: targetInstitutionId,
      academicYearId,
      classId: classId || null,
      name: name.trim(),
      description: description || '',
      components,
      totalAmount,
      createdBy: req.user._id
    });

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'FEE_STRUCTURE_CREATED',
      target: feeStructure._id,
      details: { name: feeStructure.name, totalAmount: feeStructure.totalAmount }
    });

    return sendSuccess(res, 201, 'Fee structure created successfully', {
      feeStructure
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Fee Structures
 * @route   GET /api/v1/fee-structures
 * @access  Private
 */
const getFeeStructures = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    const { academicYearId, classId, search } = req.query;

    if (academicYearId) filter.academicYearId = academicYearId;
    if (classId) filter.classId = classId;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const structures = await FeeStructure.find(filter)
      .populate('academicYearId', 'name isCurrent status')
      .populate('classId', 'name className code')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Fee structures retrieved successfully', {
      count: structures.length,
      feeStructures: structures
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Fee Structure by ID
 * @route   GET /api/v1/fee-structures/:id
 * @access  Private
 */
const getFeeStructureById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Fee Structure ID.');
    }

    const structure = await FeeStructure.findById(id)
      .populate('academicYearId', 'name isCurrent status')
      .populate('classId', 'name className code');

    if (!structure) {
      return sendError(res, 404, 'Fee structure not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? structure.institutionId : req.user.institutionId;
    if (structure.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    return sendSuccess(res, 200, 'Fee structure retrieved successfully', {
      feeStructure: structure
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Fee Structure
 * @route   PATCH /api/v1/fee-structures/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateFeeStructureById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return sendError(res, 400, 'Invalid Fee Structure ID.');
    }

    const structure = await FeeStructure.findById(id);
    if (!structure) {
      return sendError(res, 404, 'Fee structure not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? structure.institutionId : req.user.institutionId;
    if (structure.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Cross-institution access denied.');
    }

    const { name, description, components, isActive } = req.body;

    if (name) structure.name = name.trim();
    if (description !== undefined) structure.description = description;
    if (isActive !== undefined) structure.isActive = Boolean(isActive);

    if (components && Array.isArray(components) && components.length > 0) {
      structure.components = components;
      structure.totalAmount = components.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    }

    structure.updatedBy = req.user._id;
    await structure.save();

    logAuditEvent({
      actor: req.user._id,
      institution: targetInstitutionId,
      action: 'FEE_STRUCTURE_UPDATED',
      target: structure._id,
      details: { name: structure.name, totalAmount: structure.totalAmount }
    });

    return sendSuccess(res, 200, 'Fee structure updated successfully', {
      feeStructure: structure
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructureById
};
