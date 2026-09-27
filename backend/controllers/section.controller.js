const Section = require('../models/Section');
const Class = require('../models/Class');
const TeacherProfile = require('../models/TeacherProfile');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateSectionInput, isValidObjectId } = require('../validations/academicManagement.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create Section
 * @route   POST /api/v1/sections
 * @access  Private (Super Admin, Institution Admin)
 */
const createSection = async (req, res, next) => {
  try {
    const val = validateSectionInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? req.body.institutionId : req.user.institutionId;

    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { classId, academicYearId, name, capacity, roomNumber, classTeacherId } = req.body;

    // Verify class exists and belongs to target institution & academic year
    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return sendError(res, 404, 'Referenced class not found.');
    }
    if (targetClass.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Referenced class does not belong to your institution.');
    }
    if (targetClass.academicYearId.toString() !== academicYearId.toString()) {
      return sendError(res, 400, 'Class does not belong to specified academic year.');
    }

    // Verify classTeacher if provided
    if (classTeacherId) {
      const teacher = await TeacherProfile.findById(classTeacherId);
      if (!teacher) {
        return sendError(res, 404, 'Referenced teacher not found.');
      }
      if (teacher.institutionId.toString() !== targetInstitutionId.toString()) {
        return sendError(res, 400, 'Class teacher must belong to the same institution.');
      }
    }

    // Duplicate check under class + academicYear
    const existingSection = await Section.findOne({
      classId,
      academicYearId,
      name: name.trim()
    });

    if (existingSection) {
      return sendError(res, 400, `Section '${name.trim()}' already exists for this class and academic year.`);
    }

    const section = await Section.create({
      institutionId: targetInstitutionId,
      academicYearId,
      classId,
      name: name.trim(),
      capacity: Number(capacity),
      roomNumber: roomNumber ? roomNumber.trim() : '',
      classTeacherId: classTeacherId || null,
      isActive: true
    });

    await logAuditEvent({
      actor: req.user,
      action: 'SECTION_CREATED',
      institutionId: targetInstitutionId,
      details: { sectionId: section._id, name: section.name, classId },
      req
    });

    return sendSuccess(res, 201, 'Section created successfully.', { section });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Duplicate section name under the same class.');
    }
    next(error);
  }
};

/**
 * @desc    Get Sections List
 * @route   GET /api/v1/sections
 * @access  Private
 */
const getSections = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const sections = await Section.find(filter)
      .populate('classId', 'name displayName')
      .populate('academicYearId', 'name status')
      .populate({
        path: 'classTeacherId',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .sort({ name: 1 });

    return sendSuccess(res, 200, 'Sections retrieved successfully.', {
      count: sections.length,
      sections
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Section
 * @route   GET /api/v1/sections/:id
 * @access  Private
 */
const getSectionById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Section ID.');
    }

    const section = await Section.findById(req.params.id)
      .populate('classId', 'name displayName')
      .populate('academicYearId', 'name status')
      .populate({
        path: 'classTeacherId',
        populate: { path: 'userId', select: 'fullName email' }
      });

    if (!section) {
      return sendError(res, 404, 'Section not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (section.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot access section belonging to another institution.');
      }
    }

    return sendSuccess(res, 200, 'Section details retrieved.', { section });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Section
 * @route   PATCH /api/v1/sections/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateSection = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Section ID.');
    }

    const section = await Section.findById(req.params.id);

    if (!section) {
      return sendError(res, 404, 'Section not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (section.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot update section belonging to another institution.');
      }
    }

    const { name, capacity, roomNumber, classTeacherId, isActive } = req.body;

    if (capacity !== undefined) {
      if (Number(capacity) <= 0 || isNaN(Number(capacity))) {
        return sendError(res, 400, 'Capacity must be a positive number.');
      }
      section.capacity = Number(capacity);
    }

    if (classTeacherId !== undefined) {
      if (classTeacherId) {
        const teacher = await TeacherProfile.findById(classTeacherId);
        if (!teacher) {
          return sendError(res, 404, 'Referenced teacher not found.');
        }
        if (teacher.institutionId.toString() !== section.institutionId.toString()) {
          return sendError(res, 400, 'Class teacher must belong to the same institution.');
        }
        section.classTeacherId = classTeacherId;
      } else {
        section.classTeacherId = null;
      }
    }

    if (name && name.trim() !== section.name) {
      const existingSection = await Section.findOne({
        classId: section.classId,
        academicYearId: section.academicYearId,
        name: name.trim(),
        _id: { $ne: section._id }
      });
      if (existingSection) {
        return sendError(res, 400, `Section '${name.trim()}' already exists under this class.`);
      }
      section.name = name.trim();
    }

    if (roomNumber !== undefined) section.roomNumber = roomNumber.trim();
    if (isActive !== undefined) section.isActive = isActive;

    await section.save();

    await logAuditEvent({
      actor: req.user,
      action: 'SECTION_UPDATED',
      institutionId: section.institutionId,
      details: { sectionId: section._id, name: section.name },
      req
    });

    return sendSuccess(res, 200, 'Section updated successfully.', { section });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate Section
 * @route   PATCH /api/v1/sections/:id/deactivate
 * @access  Private (Super Admin, Institution Admin)
 */
const deactivateSection = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Section ID.');
    }

    const section = await Section.findById(req.params.id);

    if (!section) {
      return sendError(res, 404, 'Section not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (section.institutionId.toString() !== req.user.institutionId?.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot deactivate section belonging to another institution.');
      }
    }

    section.isActive = false;
    await section.save();

    await logAuditEvent({
      actor: req.user,
      action: 'SECTION_DEACTIVATED',
      institutionId: section.institutionId,
      details: { sectionId: section._id, name: section.name },
      req
    });

    return sendSuccess(res, 200, `Section '${section.name}' deactivated.`, { section });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deactivateSection
};
