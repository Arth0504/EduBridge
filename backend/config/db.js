const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return true;
  }

  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/edubridge';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`);
    return true;
  } catch (error) {
    logger.warn(`MongoDB Connection Warning: ${error.message}`);
    logger.warn('Backend running in standalone mode. Database features will reconnect when MongoDB is online.');
    return false;
  }
};

const getDBStatus = () => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[readyState] || 'unknown';
};

module.exports = { connectDB, getDBStatus };
