const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema(
  {
    examinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Examination',
      required: [true, 'Examination ID is required']
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
    examDate: {
      type: Date,
      required: [true, 'Exam date is required']
    },
    startTime: {
      type: String,
      trim: true,
      default: '09:00'
    },
    endTime: {
      type: String,
      trim: true,
      default: '12:00'
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
      min: [1, 'Max marks must be greater than zero']
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks is required'],
      min: [0, 'Passing marks cannot be negative']
    },
    roomNumber: {
      type: String,
      trim: true,
      default: ''
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    }
  },
  { timestamps: true }
);

// Prevent duplicate schedule for the same examination, class, section and subject
examScheduleSchema.index(
  { examinationId: 1, classId: 1, sectionId: 1, subjectId: 1 },
  { unique: true }
);

// Search indexes
examScheduleSchema.index({ institutionId: 1, academicYearId: 1, classId: 1, sectionId: 1 });
examScheduleSchema.index({ examinationId: 1, examDate: 1 });

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
