const mongoose = require('mongoose');
const dns = require('dns');
const logger = require('../utils/logger');

// Set reliable public DNS servers for Node.js c-ares resolver to fix querySrv ECONNREFUSED issues
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Fall back to default resolver if system restricts setServers
}

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing MongoDB Atlas connection');
    return true;
  }

  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoURI || mongoURI.includes('<username>') || mongoURI.includes('<password>')) {
    logger.warn('⚠️ MONGODB_URI environment variable is using placeholder credentials or is not configured.');
    logger.warn('Please update backend/.env with your valid MongoDB Atlas connection string.');
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      dbName: 'EduBridge',
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    logger.info(`✅ Connected to MongoDB Atlas Cluster | Database: ${conn.connection.name} | Host: ${conn.connection.host}`);
    return true;
  } catch (error) {
    logger.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    logger.warn('Backend running with MongoDB status offline. Verify Atlas cluster IP access list (0.0.0.0/0) and credentials in .env');
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
