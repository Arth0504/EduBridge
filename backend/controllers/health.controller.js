const { getDBStatus } = require('../config/db');

const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EduBridge Backend Operational API Health Check',
    system: {
      name: 'EduBridge Backend API',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    database: {
      status: getDBStatus()
    },
    institutionContext: req.institutionId || 'global'
  });
};

module.exports = { getHealthStatus };
