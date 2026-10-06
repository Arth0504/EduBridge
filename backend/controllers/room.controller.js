const Room = require('../models/Room');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateRoomInput, isValidObjectId } = require('../validations/room.validation');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    Create Room
 * @route   POST /api/v1/rooms
 * @access  Private (Super Admin, Institution Admin)
 */
const createRoom = async (req, res, next) => {
  try {
    const val = validateRoomInput(req.body);
    if (!val.isValid) {
      return sendError(res, 400, val.errors.join(' '));
    }

    const targetInstitutionId = req.user.role === 'super_admin' ? (req.body.institutionId || req.user.institutionId) : req.user.institutionId;
    if (!targetInstitutionId || !isValidObjectId(targetInstitutionId)) {
      return sendError(res, 400, 'Valid Institution ID is required.');
    }

    const { roomNumber, name, roomType, capacity, building, floor } = req.body;

    const existing = await Room.findOne({
      institutionId: targetInstitutionId,
      roomNumber: roomNumber.trim()
    });

    if (existing) {
      return sendError(res, 400, `Room number '${roomNumber}' already exists for this institution.`);
    }

    const room = await Room.create({
      institutionId: targetInstitutionId,
      roomNumber: roomNumber.trim(),
      name: name ? name.trim() : roomNumber.trim(),
      roomType: roomType || 'classroom',
      capacity: capacity || 40,
      building: building ? building.trim() : '',
      floor: floor ? floor.trim() : '',
      isActive: true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'ROOM_CREATED',
      institutionId: targetInstitutionId,
      details: { roomId: room._id, roomNumber: room.roomNumber, roomType: room.roomType },
      req
    });

    return sendSuccess(res, 201, 'Room created successfully.', { room });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Room number already exists for this institution.');
    }
    next(error);
  }
};

/**
 * @desc    Get Rooms
 * @route   GET /api/v1/rooms
 * @access  Private
 */
const getRooms = async (req, res, next) => {
  try {
    const filter = {};
    const targetInstitutionId = req.user.role === 'super_admin' ? (req.query.institutionId || req.user.institutionId) : req.user.institutionId;
    if (targetInstitutionId) filter.institutionId = targetInstitutionId;

    if (req.query.roomType) filter.roomType = req.query.roomType;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const rooms = await Room.find(filter).sort({ roomNumber: 1 });

    return sendSuccess(res, 200, 'Rooms retrieved successfully.', {
      count: rooms.length,
      rooms
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Room by ID
 * @route   GET /api/v1/rooms/:id
 * @access  Private
 */
const getRoomById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Room ID.');
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return sendError(res, 404, 'Room not found.');
    }

    if (req.user.role !== 'super_admin' && room.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot access room from another institution.');
    }

    return sendSuccess(res, 200, 'Room retrieved.', { room });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Room
 * @route   PATCH /api/v1/rooms/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const updateRoom = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Room ID.');
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return sendError(res, 404, 'Room not found.');
    }

    if (req.user.role !== 'super_admin' && room.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot update room for another institution.');
    }

    const { name, roomType, capacity, building, floor, isActive } = req.body;
    if (name !== undefined) room.name = name;
    if (roomType !== undefined) room.roomType = roomType;
    if (capacity !== undefined) room.capacity = capacity;
    if (building !== undefined) room.building = building;
    if (floor !== undefined) room.floor = floor;
    if (isActive !== undefined) room.isActive = isActive;
    room.updatedBy = req.user._id;

    await room.save();

    await logAuditEvent({
      actor: req.user,
      action: 'ROOM_UPDATED',
      institutionId: room.institutionId,
      details: { roomId: room._id, roomNumber: room.roomNumber },
      req
    });

    return sendSuccess(res, 200, 'Room updated successfully.', { room });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Deactivate Room
 * @route   DELETE /api/v1/rooms/:id
 * @access  Private (Super Admin, Institution Admin)
 */
const deleteRoom = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, 'Invalid Room ID.');
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return sendError(res, 404, 'Room not found.');
    }

    if (req.user.role !== 'super_admin' && room.institutionId.toString() !== req.user.institutionId?.toString()) {
      return sendError(res, 403, 'Forbidden: Cannot delete room for another institution.');
    }

    room.isActive = false;
    room.updatedBy = req.user._id;
    await room.save();

    await logAuditEvent({
      actor: req.user,
      action: 'ROOM_UPDATED',
      institutionId: room.institutionId,
      details: { roomId: room._id, action: 'deactivated' },
      req
    });

    return sendSuccess(res, 200, 'Room deactivated successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom
};
