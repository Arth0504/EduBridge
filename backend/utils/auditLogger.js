const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * Log audit events to database and logger
 */
const logAuditEvent = async ({ actor = null, action, institutionId = null, details = {}, req = null }) => {
  try {
    const ipAddress = req ? req.ip || req.connection?.remoteAddress || '' : '';
    
    const logEntry = await AuditLog.create({
      actor: actor ? actor._id || actor : null,
      action,
      institutionId,
      details,
      ipAddress
    });

    logger.info(`[AUDIT] Action: ${action} | Institution: ${institutionId || 'Global'} | Actor: ${actor ? (actor.email || actor) : 'System/Public'}`);
    return logEntry;
  } catch (error) {
    logger.error(`[AUDIT ERROR] Failed to record audit log: ${error.message}`);
  }
};

module.exports = { logAuditEvent };
