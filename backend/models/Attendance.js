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
      default: null
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required']
    },
    attendanceDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half_day', 'excused', 'leave'],
      required: [true, 'Attendance status is required']
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    markedByRole: {
      type: String,
      trim: true,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    correctionReason: {
      type: String,
      trim: true,
      default: ''
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Pre-save hook to ensure `date` and `attendanceDate` are synchronized at UTC midnight
attendanceSchema.pre('save', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
    this.attendanceDate = d;
  } else if (this.attendanceDate) {
    const d = new Date(this.attendanceDate);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
    this.attendanceDate = d;
  }
  next();
});

// Compound unique index to prevent duplicate attendance records for the same student on the same date
attendanceSchema.index(
  {
    institutionId: 1,
    academicYearId: 1,
    studentId: 1,
    date: 1,
    subjectId: 1
  },
  { unique: true }
);

// Search indexes
attendanceSchema.index({ institutionId: 1, academicYearId: 1, classId: 1, sectionId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, academicYearId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
