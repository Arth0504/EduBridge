const User = require('../models/User');
const ParentChildLink = require('../models/ParentChildLink');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Get Parent-Child Links List
 * @route   GET /api/v1/parent-child-links
 * @access  Private
 */
const getParentChildLinks = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'super_admin') {
      if (req.query.institutionId) filter.institutionId = req.query.institutionId;
    } else {
      filter.institutionId = req.user.institutionId;
    }

    if (req.user.role === 'parent') {
      filter.parentId = req.user._id;
    } else if (req.user.role === 'student') {
      filter.studentId = req.user._id;
    } else {
      if (req.query.parentId) filter.parentId = req.query.parentId;
      if (req.query.studentId) filter.studentId = req.query.studentId;
    }

    const links = await ParentChildLink.find(filter)
      .populate('parentId', 'fullName email phone isActive')
      .populate('studentId', 'fullName email phone isActive')
      .populate('institutionId', 'institutionName institutionCode')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Parent-child links retrieved', {
      count: links.length,
      links
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create Parent-Child Link
 * @route   POST /api/v1/parent-child-links
 * @access  Private (Super Admin, Institution Admin)
 */
const createParentChildLink = async (req, res, next) => {
  try {
    const { parentId, studentId, relationship, isPrimaryContact } = req.body;

    if (!parentId || !studentId) {
      return sendError(res, 400, 'Both parentId and studentId are required.');
    }

    // Verify parent
    const parentUser = await User.findById(parentId);
    if (!parentUser || parentUser.role !== 'parent') {
      return sendError(res, 400, 'Invalid parent user provided.');
    }

    // Verify student
    const studentUser = await User.findById(studentId);
    if (!studentUser || studentUser.role !== 'student') {
      return sendError(res, 400, 'Invalid student user provided.');
    }

    // Enforce Tenant Scope
    const targetInstitutionId = req.user.role === 'super_admin'
      ? parentUser.institutionId
      : req.user.institutionId;

    if (req.user.role !== 'super_admin') {
      if (
        parentUser.institutionId.toString() !== req.user.institutionId.toString() ||
        studentUser.institutionId.toString() !== req.user.institutionId.toString()
      ) {
        return sendError(res, 403, 'Forbidden: Cannot link users outside your institution.');
      }
    }

    // Verify both belong to same institution
    if (parentUser.institutionId.toString() !== studentUser.institutionId.toString()) {
      return sendError(res, 400, 'Parent and student must belong to the same institution.');
    }

    // Check duplicate link
    const existingLink = await ParentChildLink.findOne({ parentId, studentId });
    if (existingLink) {
      return sendError(res, 400, 'Parent and student are already linked.');
    }

    const link = await ParentChildLink.create({
      parentId,
      studentId,
      institutionId: targetInstitutionId,
      relationship: relationship ? relationship.toLowerCase() : 'father',
      isPrimaryContact: isPrimaryContact !== undefined ? Boolean(isPrimaryContact) : true
    });

    await logAuditEvent({
      actor: req.user,
      action: 'PARENT_CHILD_LINK_CREATE',
      institutionId: targetInstitutionId,
      details: { parentId, studentId, linkId: link._id },
      req
    });

    return sendSuccess(res, 201, 'Parent-child link created successfully.', { link });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove Parent-Child Link
 * @route   DELETE /api/v1/parent-child-links/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const removeParentChildLink = async (req, res, next) => {
  try {
    const link = await ParentChildLink.findById(req.params.id);

    if (!link) {
      return sendError(res, 404, 'Parent-child link not found.');
    }

    if (req.user.role !== 'super_admin') {
      if (link.institutionId.toString() !== req.user.institutionId.toString()) {
        return sendError(res, 403, 'Forbidden: Cannot remove links outside your institution.');
      }
    }

    await ParentChildLink.findByIdAndDelete(req.params.id);

    await logAuditEvent({
      actor: req.user,
      action: 'PARENT_CHILD_LINK_REMOVE',
      institutionId: link.institutionId,
      details: { linkId: link._id, parentId: link.parentId, studentId: link.studentId },
      req
    });

    return sendSuccess(res, 200, 'Parent-child link removed successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getParentChildLinks,
  createParentChildLink,
  removeParentChildLink
};
