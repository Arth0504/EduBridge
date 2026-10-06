const mongoose = require('mongoose');

const examMarkSchema = new mongoose.Schema(
  {
    examinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: [true, 'Examination ID is required']
    },
    examScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSchedule',
      required: [true, 'Exam Schedule ID is required']
    },
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
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required']
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: [true, 'Student Profile ID is required']
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained is required'],
      min: [0, 'Marks obtained cannot be negative']
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
      min: [1, 'Max marks must be greater than zero']
    },
    passingMarks: {
      type: Number,
      default: 0
    },
    grade: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pass', 'fail', 'absent', 'exempted'],
      default: 'pass'
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enteredByRole: {
      type: String,
      trim: true,
      default: ''
    },
    correctionReason: {
      type: String,
      trim: true,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date,
      default: null
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

// Prevent duplicate mark entries for same student, examination and schedule
examMarkSchema.index(
  { examinationId: 1, examScheduleId: 1, studentId: 1 },
  { unique: true }
);

// Search indexes
examMarkSchema.index({ institutionId: 1, academicYearId: 1, classId: 1, sectionId: 1 });
examMarkSchema.index({ studentId: 1, examinationId: 1 });
examMarkSchema.index({ isPublished: 1 });

module.exports = mongoose.model('ExamMark', examMarkSchema);
