const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email address']

    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: {
        values: ['super_admin', 'institution_admin', 'teacher', 'student', 'parent'],
        message: '{VALUE} is not a valid user role'
      },
      default: 'student'
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: false // Null for SuperAdmin
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

/**
 * Pre-save Hook: Enforce Single Super Admin Rule & Hash Password
 */
userSchema.pre('save', async function (next) {
  // 1. Enforce Single Super Admin system rule
  if (this.role === 'super_admin' && (this.isNew || this.isModified('role'))) {
    const existingSuperAdmin = await this.constructor.findOne({
      role: 'super_admin',
      _id: { $ne: this._id }
    });
    if (existingSuperAdmin) {
      return next(new Error('SYSTEM_RULE_VIOLATION: Exactly ONE Super Admin is permitted system-wide.'));
    }
  }

  // 2. Hash password if modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance Method: Compare entered password with hashed password in database
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Instance Method: Return safe JSON object excluding sensitive fields
 */
userSchema.methods.toSafeObject = function () {
  const userObj = this.toObject();
  delete userObj.password;
  delete userObj.__v;
  return userObj;
};

module.exports = mongoose.model('User', userSchema);
