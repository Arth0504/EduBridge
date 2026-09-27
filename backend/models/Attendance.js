const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution ID is required']
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'Academic Year ID is required']
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required']
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section ID is required']
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: [true, 'Student Profile ID is required']
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      required: [true, 'Teacher Profile ID is required']
    },
    attendanceDate: {
      type: Date,
      required: [true, 'Attendance date is required']
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'leave'],
      required: [true, 'Attendance status is required']
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate attendance records for the same student on the same date for a given subject/daily scope
attendanceSchema.index(
  {
    institutionId: 1,
    academicYearId: 1,
    classId: 1,
    sectionId: 1,
    studentId: 1,
    attendanceDate: 1,
    subjectId: 1
  },
  { unique: true }
);

// Search indexes
attendanceSchema.index({ institutionId: 1, academicYearId: 1, classId: 1, sectionId: 1, attendanceDate: 1 });
attendanceSchema.index({ studentId: 1, academicYearId: 1, attendanceDate: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
