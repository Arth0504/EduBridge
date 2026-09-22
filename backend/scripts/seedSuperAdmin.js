require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectDB } = require('../config/db');
const logger = require('../utils/logger');

const seedSuperAdmin = async () => {
  try {
    logger.info('Starting Single Super Admin Seed Process...');

    const isConnected = await connectDB();
    if (!isConnected) {
      logger.error('Database connection failed. Cannot proceed with seed.');
      process.exit(1);
    }

    // Check if any Super Admin already exists in database
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      logger.info(`✅ System Rule Enforced: Super Admin already exists (${existingSuperAdmin.email}). No duplicate created.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@edubridge.org';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecretPassword123!';
    const fullName = process.env.SUPER_ADMIN_NAME || 'System Administrator';

    // Create the single Super Admin user
    const superAdmin = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      role: 'super_admin',
      institutionId: null,
      isActive: true,
      isEmailVerified: true
    });

    logger.info(`🎉 Single System Super Admin created successfully!`);
    logger.info(`   Name: ${superAdmin.fullName}`);
    logger.info(`   Email: ${superAdmin.email}`);
    logger.info(`   Role: ${superAdmin.role}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Super Admin seed failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedSuperAdmin();
