require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const logger = require('./utils/logger');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const institutionRoutes = require('./routes/institution.routes');
const institutionMiddleware = require('./middleware/institution.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/user.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const parentRoutes = require('./routes/parent.routes');
const parentChildLinkRoutes = require('./routes/parentChildLink.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Multi-Tenant / Institution Context Middleware
app.use(institutionMiddleware);

// API Routes
app.use('/api', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/institutions', institutionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/parents', parentRoutes);
app.use('/api/v1/parent-child-links', parentChildLinkRoutes);



// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to EduBridge Multi-Institution Platform API',
    docs: '/api/health',
    status: 'running'
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    logger.info(`==================================================`);
    logger.info(`  EduBridge API Server Running on Port ${PORT}`);
    logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`  Health Endpoint: http://localhost:${PORT}/api/health`);
    logger.info(`==================================================`);
  });
};

startServer();
