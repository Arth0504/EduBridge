const Timetable = require('../models/Timetable');
const TeacherSubjectAssignment = require('../models/TeacherSubjectAssignment');
const TeacherProfile = require('../models/TeacherProfile');
const StudentProfile = require('../models/StudentProfile');
const StudentAcademicEnrollment = require('../models/StudentAcademicEnrollment');
const ParentChildLink = require('../models/ParentChildLink');
const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Room = require('../models/Room');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateCreateTimetableInput, validateUpdateTimetableInput, isValidObjectId } = require('../validations/timetable.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Helper: Resolve active Academic Year for institution if not specified
 */
const getActiveAcademicYearId = async (institutionId) => {
  const activeYear = await AcademicYear.findOne({ institutionId, status: 'active' });
  return activeYear ? activeYear._id : null;
};

/**
 * Helper: Resolve Teacher Profile for logged in User
 */
const getTeacherProfileForUser = async (userId, institutionId) => {
  return await TeacherProfile.findOne({ userId, institutionId });
};

/**
 * Helper: Resolve linked Student Profile IDs for a Parent User
 */
const getParentLinkedStudentProfiles = async (parentUserId, institutionId) => {
  const links = await ParentChildLink.find({ parentId: parentUserId, institutionId });
  const studentUserIds = links.map((l) => l.studentId);
  return await StudentProfile.find({ userId: { $in: studentUserIds }, institutionId });
};

/**
 * @desc    Create Timetable Entry
 * @route   POST /api/v1/timetables
 * @access  Private (Super Admin, Institution Admin)
 */
const createTimetable = async (req, res, next) => {
  try {
    const val = validateCreateTimetableInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? (req.body.institutionId || req.user.institutionId) : req.user.institutionId;
    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const {
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      periodNumber,
      startTime,
      endTime,
      roomId,
      roomName
    } = req.body;

    // 1. Verify Academic Year
    const academicYear = await AcademicYear.findById(academicYearId);
    if (!academicYear || academicYear.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Invalid or cross-tenant academic year.');
    }

    // 2. Verify Class & Section
    const targetClass = await Class.findById(classId);
    if (!targetClass || targetClass.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Invalid or cross-tenant class.');
    }

    const section = await Section.findById(sectionId);
    if (!section || section.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Invalid or cross-tenant section.');
    }
    if (section.classId.toString() !== classId.toString()) {
      return sendError(res, 400, 'Section does not belong to specified class.');
    }

    // 3. Verify Subject
    const subject = await Subject.findById(subjectId);
    if (!subject || subject.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Invalid or cross-tenant subject.');
    }

    // 4. Verify Teacher Profile
    const teacher = await TeacherProfile.findById(teacherId);
    if (!teacher || teacher.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 400, 'Invalid or cross-tenant teacher.');
    }

    // 5. CRITICAL: Check Teacher Authorization via TeacherSubjectAssignment
    const assignment = await TeacherSubjectAssignment.findOne({
      institutionId: targetInstitutionId,
      academicYearId,
      teacherId,
      subjectId,
      classId,
      sectionId,
      isActive: true
    });

    if (!assignment) {
      return sendError(
        res,
        400,
        'Teacher Authorization Error: Teacher is not assigned to teach this subject in the specified class and section for this academic year.'
      );
    }

    // 6. Verify Room if roomId is provided
    let finalRoomName = roomName ? roomName.trim() : '';
    let validRoomId = null;
    if (roomId) {
      const room = await Room.findById(roomId);
      if (!room || room.institutionId.toString() !== targetInstitutionId.toString()) {
        return sendError(res, 400, 'Invalid or cross-tenant room.');
      }
      validRoomId = room._id;
      finalRoomName = room.name || room.roomNumber;
    }

    // 7. SECTION CONFLICT DETECTION
    // A section cannot have two subjects during the same academic year, day, and period
    const sectionConflict = await Timetable.findOne({
      institutionId: targetInstitutionId,
      academicYearId,
      classId,
      sectionId,
      dayOfWeek,
      periodNumber,
      isActive: true
    });

    if (sectionConflict) {
      return sendError(
        res,
        409,
        `Section Conflict: Section already has a subject scheduled for ${dayOfWeek} Period ${periodNumber}.`
      );
    }

    // 8. TEACHER CONFLICT DETECTION
    // Prevent teacher from being assigned to two different sections during the same academic year, day, and period
    const teacherConflict = await Timetable.findOne({
      institutionId: targetInstitutionId,
      academicYearId,
      teacherId,
      dayOfWeek,
      periodNumber,
      isActive: true
    });

    if (teacherConflict) {
      return sendError(
        res,
        409,
        `Teacher Conflict: Teacher is already assigned to another section during ${dayOfWeek} Period ${periodNumber}.`
      );
    }

    // 9. ROOM CONFLICT DETECTION
    // A room cannot be allocated to multiple classes/sections during the same academic year, day, and period
    if (validRoomId || finalRoomName) {
      const roomOrConditions = [];
      if (validRoomId) roomOrConditions.push({ roomId: validRoomId });
      if (finalRoomName) roomOrConditions.push({ roomName: new RegExp(`^${finalRoomName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

      const roomConflict = await Timetable.findOne({
        institutionId: targetInstitutionId,
        academicYearId,
        dayOfWeek,
        periodNumber,
        isActive: true,
        $or: roomOrConditions
      });

      if (roomConflict) {
        return sendError(
          res,
          409,
          `Room Conflict: Room '${finalRoomName}' is already allocated to another section during ${dayOfWeek} Period ${periodNumber}.`
        );
      }
    }

    // Create timetable entry
    const timetable = await Timetable.create({
      institutionId: targetInstitutionId,
      academicYearId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      dayOfWeek,
      periodNumber,
      startTime,
      endTime,
      roomId: validRoomId,
      roomName: finalRoomName,
      isActive: true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'TIMETABLE_CREATED',
      institutionId: targetInstitutionId,
      details: { timetableId: timetable._id, classId, sectionId, subjectId, teacherId, dayOfWeek, periodNumber },
      req
    });

    const populated = await Timetable.findById(timetable._id)
      .populate('academicYearId', 'name status')
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('subjectId', 'name subjectCode subjectType')
      .populate({
        path: 'teacherId',
        select: 'employeeId designation',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .populate('roomId', 'roomNumber name roomType building floor');

    return sendSuccess(res, 201, 'Timetable entry created successfully.', { timetable: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Timetable Entries with Filters and Role-Based Restrictions
 * @route   GET /api/v1/timetables
 * @access  Private
 */
const getTimetables = async (req, res, next) => {
  try {
    const filter = { isActive: { $ne: false } };

    const targetInstitutionId = req.user.role === 'super_admin' ? (req.query.institutionId || req.user.institutionId) : req.user.institutionId;
    if (targetInstitutionId) filter.institutionId = targetInstitutionId;

    // Academic Year scoping
    let academicYearId = req.query.academicYearId;
    if (!academicYearId && targetInstitutionId) {
      academicYearId = await getActiveAcademicYearId(targetInstitutionId);
    }
    if (academicYearId) {
      filter.academicYearId = academicYearId;
    }

    // Standard filters
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.dayOfWeek) filter.dayOfWeek = req.query.dayOfWeek;
    if (req.query.teacherId) filter.teacherId = req.query.teacherId;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    // Role Enforcement
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!teacherProfile) {
        return sendSuccess(res, 200, 'No teacher profile found.', { count: 0, timetables: [] });
      }
      filter.teacherId = teacherProfile._id;
    } else if (req.user.role === 'student') {
      const studentProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      if (!studentProfile) {
        return sendSuccess(res, 200, 'Student profile not found.', { count: 0, timetables: [] });
      }

      // Resolve student's current active academic enrollment
      const activeEnrollment = await StudentAcademicEnrollment.findOne({
        studentId: studentProfile._id,
        institutionId: targetInstitutionId,
        ...(academicYearId ? { academicYearId } : {}),
        enrollmentStatus: 'active'
      });

      if (!activeEnrollment) {
        return sendSuccess(res, 200, 'No active academic enrollment found.', { count: 0, timetables: [] });
      }

      filter.classId = activeEnrollment.classId;
      filter.sectionId = activeEnrollment.sectionId;
    } else if (req.user.role === 'parent') {
      const linkedStudents = await getParentLinkedStudentProfiles(req.user._id, targetInstitutionId);
      if (linkedStudents.length === 0) {
        return sendSuccess(res, 200, 'No linked children found.', { count: 0, timetables: [] });
      }

      let selectedStudentId = req.query.studentId;
      let targetStudentProfiles = linkedStudents;

      if (selectedStudentId) {
        targetStudentProfiles = linkedStudents.filter((s) => s._id.toString() === selectedStudentId.toString());
        if (targetStudentProfiles.length === 0) {
          return sendError(res, 403, 'Forbidden: Selected student is not linked to your parent account.');
        }
      }

      // Get enrollments for linked children
      const enrollments = await StudentAcademicEnrollment.find({
        studentId: { $in: targetStudentProfiles.map((s) => s._id) },
        institutionId: targetInstitutionId,
        ...(academicYearId ? { academicYearId } : {}),
        enrollmentStatus: 'active'
      });

      if (enrollments.length === 0) {
        return sendSuccess(res, 200, 'No active enrollments for linked children.', { count: 0, timetables: [] });
      }

      const sectionIds = [...new Set(enrollments.map((e) => e.sectionId.toString()))];
      filter.sectionId = { $in: sectionIds };
    }

    const timetables = await Timetable.find(filter)
      .populate('academicYearId', 'name status')
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('subjectId', 'name subjectCode subjectType credits')
      .populate({
        path: 'teacherId',
        select: 'employeeId designation',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('roomId', 'roomNumber name roomType building floor')
      .sort({ periodNumber: 1, dayOfWeek: 1 });

    return sendSuccess(res, 200, 'Timetables retrieved successfully.', {
      count: timetables.length,
      timetables
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Single Timetable Entry by ID
 * @route   GET /api/v1/timetables/:id
 * @access  Private
 */
const getTimetableById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Timetable ID.');
    }

    const timetable = await Timetable.findById(req.params.id)
      .populate('academicYearId', 'name status')
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('subjectId', 'name subjectCode subjectType credits')
      .populate({
        path: 'teacherId',
        select: 'employeeId designation',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('roomId', 'roomNumber name roomType building floor');

    if (!timetable) {
      return sendError(res, 404, 'Timetable entry not found.');
    }

    if (req.user.role !== 'super_admin' && timetable.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot access timetable entry from another institution.');
    }

    // Role-specific check
    if (req.user.role === 'teacher') {
      const teacherProfile = await getTeacherProfileForUser(req.user._id, timetable.institutionId);
      if (!teacherProfile || timetable.teacherId._id.toString() !== teacherProfile._id.toString()) {
        return sendError(res, 403, 'Forbidden: Teachers can view only their own assigned timetables.');
      }
    } else if (req.user.role === 'student') {
      const studentProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: timetable.institutionId });
      const enrollment = await StudentAcademicEnrollment.findOne({
        studentId: studentProfile?._id,
        sectionId: timetable.sectionId._id,
        enrollmentStatus: 'active'
      });
      if (!enrollment) {
        return sendError(res, 403, 'Forbidden: Students can view only their own section timetable.');
      }
    }

    return sendSuccess(res, 200, 'Timetable entry retrieved.', { timetable });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Timetable Entry
 * @route   PATCH /api/v1/timetables/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateTimetable = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Timetable ID.');
    }

    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return sendError(res, 404, 'Timetable entry not found.');
    }

    if (req.user.role !== 'super_admin' && timetable.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot update timetable entry for another institution.');
    }

    const val = validateUpdateTimetableInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = timetable.institutionId;
    const academicYearId = req.body.academicYearId || timetable.academicYearId;
    const classId = req.body.classId || timetable.classId;
    const sectionId = req.body.sectionId || timetable.sectionId;
    const subjectId = req.body.subjectId || timetable.subjectId;
    const teacherId = req.body.teacherId || timetable.teacherId;
    const dayOfWeek = req.body.dayOfWeek || timetable.dayOfWeek;
    const periodNumber = req.body.periodNumber !== undefined ? req.body.periodNumber : timetable.periodNumber;
    const roomId = req.body.roomId !== undefined ? req.body.roomId : timetable.roomId;
    const roomName = req.body.roomName !== undefined ? req.body.roomName : timetable.roomName;

    // Validate Teacher Subject Assignment
    const assignment = await TeacherSubjectAssignment.findOne({
      institutionId: targetInstitutionId,
      academicYearId,
      teacherId,
      subjectId,
      classId,
      sectionId,
      isActive: true
    });

    if (!assignment) {
      return sendError(
        res,
        400,
        'Teacher Authorization Error: Teacher is not assigned to teach this subject in the specified class and section for this academic year.'
      );
    }

    // SECTION CONFLICT CHECK
    const sectionConflict = await Timetable.findOne({
      _id: { $ne: timetable._id },
      institutionId: targetInstitutionId,
      academicYearId,
      classId,
      sectionId,
      dayOfWeek,
      periodNumber,
      isActive: true
    });

    if (sectionConflict) {
      return sendError(
        res,
        409,
        `Section Conflict: Section already has a subject scheduled for ${dayOfWeek} Period ${periodNumber}.`
      );
    }

    // TEACHER CONFLICT CHECK
    const teacherConflict = await Timetable.findOne({
      _id: { $ne: timetable._id },
      institutionId: targetInstitutionId,
      academicYearId,
      teacherId,
      dayOfWeek,
      periodNumber,
      isActive: true
    });

    if (teacherConflict) {
      return sendError(
        res,
        409,
        `Teacher Conflict: Teacher is already assigned to another section during ${dayOfWeek} Period ${periodNumber}.`
      );
    }

    // ROOM CONFLICT CHECK
    if (roomId || roomName) {
      const roomOrConditions = [];
      if (roomId) roomOrConditions.push({ roomId });
      if (roomName) roomOrConditions.push({ roomName: new RegExp(`^${roomName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

      const roomConflict = await Timetable.findOne({
        _id: { $ne: timetable._id },
        institutionId: targetInstitutionId,
        academicYearId,
        dayOfWeek,
        periodNumber,
        isActive: true,
        $or: roomOrConditions
      });

      if (roomConflict) {
        return sendError(
          res,
          409,
          `Room Conflict: Room is already allocated to another section during ${dayOfWeek} Period ${periodNumber}.`
        );
      }
    }

    if (req.body.academicYearId) timetable.academicYearId = req.body.academicYearId;
    if (req.body.classId) timetable.classId = req.body.classId;
    if (req.body.sectionId) timetable.sectionId = req.body.sectionId;
    if (req.body.subjectId) timetable.subjectId = req.body.subjectId;
    if (req.body.teacherId) timetable.teacherId = req.body.teacherId;
    if (req.body.dayOfWeek) timetable.dayOfWeek = req.body.dayOfWeek;
    if (req.body.periodNumber !== undefined) timetable.periodNumber = req.body.periodNumber;
    if (req.body.startTime) timetable.startTime = req.body.startTime;
    if (req.body.endTime) timetable.endTime = req.body.endTime;
    if (req.body.roomId !== undefined) timetable.roomId = req.body.roomId;
    if (req.body.roomName !== undefined) timetable.roomName = req.body.roomName;
    if (req.body.isActive !== undefined) timetable.isActive = req.body.isActive;
    timetable.updatedBy = req.user._id;

    await timetable.save();

    await logAuditEvent({
      actor: req.user,
      action: 'TIMETABLE_UPDATED',
      institutionId: targetInstitutionId,
      details: { timetableId: timetable._id },
      req
    });

    return sendSuccess(res, 200, 'Timetable entry updated successfully.', { timetable });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate / Soft Delete Timetable Entry
 * @route   DELETE /api/v1/timetables/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const deleteTimetable = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Timetable ID.');
    }

    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return sendError(res, 404, 'Timetable entry not found.');
    }

    if (req.user.role !== 'super_admin' && timetable.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot delete timetable entry for another institution.');
    }

    timetable.isActive = false;
    timetable.updatedBy = req.user._id;
    await timetable.save();

    await logAuditEvent({
      actor: req.user,
      action: 'TIMETABLE_DEACTIVATED',
      institutionId: timetable.institutionId,
      details: { timetableId: timetable._id },
      req
    });

    return sendSuccess(res, 200, 'Timetable entry deactivated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Section Timetable
 * @route   GET /api/v1/timetables/section/:sectionId
 * @access  Private
 */
const getSectionTimetable = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    if (!isValidObjectId(sectionId)) {
      return sendError(res, 400, 'Invalid Section ID.');
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return sendError(res, 404, 'Section not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? section.institutionId : req.user.institutionId;

    if (section.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot access section from another institution.');
    }

    // Role restrictions
    if (req.user.role === 'student') {
      const studentProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      const activeEnrollment = await StudentAcademicEnrollment.findOne({
        studentId: studentProfile?._id,
        sectionId,
        enrollmentStatus: 'active'
      });
      if (!activeEnrollment) {
        return sendError(res, 403, 'Forbidden: You can view only your own section timetable.');
      }
    } else if (req.user.role === 'parent') {
      const linkedStudents = await getParentLinkedStudentProfiles(req.user._id, targetInstitutionId);
      const enrollments = await StudentAcademicEnrollment.find({
        studentId: { $in: linkedStudents.map((s) => s._id) },
        sectionId,
        enrollmentStatus: 'active'
      });
      if (enrollments.length === 0) {
        return sendError(res, 403, 'Forbidden: You can view timetable only for linked children sections.');
      }
    }

    let academicYearId = req.query.academicYearId || (await getActiveAcademicYearId(targetInstitutionId));

    const filter = {
      institutionId: targetInstitutionId,
      sectionId,
      isActive: true,
      ...(academicYearId ? { academicYearId } : {})
    };

    const timetables = await Timetable.find(filter)
      .populate('academicYearId', 'name status')
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('subjectId', 'name subjectCode subjectType credits')
      .populate({
        path: 'teacherId',
        select: 'employeeId designation',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('roomId', 'roomNumber name roomType building floor')
      .sort({ periodNumber: 1, dayOfWeek: 1 });

    return sendSuccess(res, 200, 'Section timetable retrieved successfully.', {
      section,
      count: timetables.length,
      timetables
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Teacher Timetable
 * @route   GET /api/v1/timetables/teacher/:teacherId
 * @access  Private
 */
const getTeacherTimetable = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    if (!isValidObjectId(teacherId)) {
      return sendError(res, 400, 'Invalid Teacher ID.');
    }

    const teacher = await TeacherProfile.findById(teacherId);
    if (!teacher) {
      return sendError(res, 404, 'Teacher profile not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? teacher.institutionId : req.user.institutionId;

    if (teacher.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot access teacher timetable from another institution.');
    }

    // Role check
    if (req.user.role === 'teacher') {
      const myProfile = await getTeacherProfileForUser(req.user._id, targetInstitutionId);
      if (!myProfile || myProfile._id.toString() !== teacherId.toString()) {
        return sendError(res, 403, 'Forbidden: You can view only your own teacher timetable.');
      }
    }

    let academicYearId = req.query.academicYearId || (await getActiveAcademicYearId(targetInstitutionId));

    const filter = {
      institutionId: targetInstitutionId,
      teacherId,
      isActive: true,
      ...(academicYearId ? { academicYearId } : {})
    };

    const timetables = await Timetable.find(filter)
      .populate('academicYearId', 'name status')
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('subjectId', 'name subjectCode subjectType credits')
      .populate({
        path: 'teacherId',
        select: 'employeeId designation',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('roomId', 'roomNumber name roomType building floor')
      .sort({ periodNumber: 1, dayOfWeek: 1 });

    return sendSuccess(res, 200, 'Teacher timetable retrieved successfully.', {
      teacher,
      count: timetables.length,
      timetables
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Student Timetable
 * @route   GET /api/v1/timetables/student/:studentId
 * @access  Private
 */
const getStudentTimetable = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!isValidObjectId(studentId)) {
      return sendError(res, 400, 'Invalid Student ID.');
    }

    const student = await StudentProfile.findById(studentId);
    if (!student) {
      return sendError(res, 404, 'Student profile not found.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? student.institutionId : req.user.institutionId;

    if (student.institutionId.toString() !== targetInstitutionId.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot access student timetable from another institution.');
    }

    // Authorization checks
    if (req.user.role === 'student') {
      const myProfile = await StudentProfile.findOne({ userId: req.user._id, institutionId: targetInstitutionId });
      if (!myProfile || myProfile._id.toString() !== studentId.toString()) {
        return sendError(res, 403, 'Forbidden: You can view only your own timetable.');
      }
    } else if (req.user.role === 'parent') {
      const linkedStudents = await getParentLinkedStudentProfiles(req.user._id, targetInstitutionId);
      const isLinked = linkedStudents.some((s) => s._id.toString() === studentId.toString());
      if (!isLinked) {
        return sendError(res, 403, 'Forbidden: You can view timetable only for linked children.');
      }
    }

    let academicYearId = req.query.academicYearId || (await getActiveAcademicYearId(targetInstitutionId));

    // Get student active enrollment
    const activeEnrollment = await StudentAcademicEnrollment.findOne({
      studentId,
      institutionId: targetInstitutionId,
      ...(academicYearId ? { academicYearId } : {}),
      enrollmentStatus: 'active'
    });

    if (!activeEnrollment) {
      return sendSuccess(res, 200, 'No active class enrollment found for student.', {
        student,
        count: 0,
        timetables: []
      });
    }

    const timetables = await Timetable.find({
      institutionId: targetInstitutionId,
      sectionId: activeEnrollment.sectionId,
      academicYearId: activeEnrollment.academicYearId,
      isActive: true
    })
      .populate('academicYearId', 'name status')
      .populate('classId', 'name displayName')
      .populate('sectionId', 'name roomNumber')
      .populate('subjectId', 'name subjectCode subjectType credits')
      .populate({
        path: 'teacherId',
        select: 'employeeId designation',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .populate('roomId', 'roomNumber name roomType building floor')
      .sort({ periodNumber: 1, dayOfWeek: 1 });

    return sendSuccess(res, 200, 'Student timetable retrieved successfully.', {
      student,
      enrollment: activeEnrollment,
      count: timetables.length,
      timetables
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Parent Child Timetable
 * @route   GET /api/v1/timetables/parent/:parentId
 * @access  Private
 */
const getParentTimetable = async (req, res, next) => {
  try {
    const { parentId } = req.params;
    if (!isValidObjectId(parentId)) {
      return sendError(res, 400, 'Invalid Parent ID.');
    }

    if (req.user.role === 'parent' && req.user._id.toString() !== parentId.toString()) {
      return sendError(res, 403, 'Forbidden: You can view only your own child timetables.');
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? (req.query.institutionId || req.user.institutionId) : req.user.institutionId;

    const linkedStudents = await getParentLinkedStudentProfiles(parentId, targetInstitutionId);
    if (linkedStudents.length === 0) {
      return sendSuccess(res, 200, 'No linked children found for this parent.', { count: 0, childTimetables: [] });
    }

    let academicYearId = req.query.academicYearId || (await getActiveAcademicYearId(targetInstitutionId));

    const childTimetables = [];

    for (const student of linkedStudents) {
      const activeEnrollment = await StudentAcademicEnrollment.findOne({
        studentId: student._id,
        institutionId: targetInstitutionId,
        ...(academicYearId ? { academicYearId } : {}),
        enrollmentStatus: 'active'
      }).populate('classId', 'name displayName').populate('sectionId', 'name roomNumber');

      if (activeEnrollment) {
        const timetables = await Timetable.find({
          institutionId: targetInstitutionId,
          sectionId: activeEnrollment.sectionId._id,
          academicYearId: activeEnrollment.academicYearId,
          isActive: true
        })
          .populate('academicYearId', 'name status')
          .populate('classId', 'name displayName')
          .populate('sectionId', 'name roomNumber')
          .populate('subjectId', 'name subjectCode subjectType credits')
          .populate({
            path: 'teacherId',
            select: 'employeeId designation',
            populate: { path: 'userId', select: 'fullName email phone' }
          })
          .populate('roomId', 'roomNumber name roomType building floor')
          .sort({ periodNumber: 1, dayOfWeek: 1 });

        childTimetables.push({
          student,
          enrollment: activeEnrollment,
          count: timetables.length,
          timetables
        });
      }
    }

    return sendSuccess(res, 200, 'Parent child timetables retrieved successfully.', {
      count: childTimetables.length,
      childTimetables
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTimetable,
  getTimetables,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  getSectionTimetable,
  getTeacherTimetable,
  getStudentTimetable,
  getParentTimetable
};
