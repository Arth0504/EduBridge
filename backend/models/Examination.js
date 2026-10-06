const mongoose = require('mongoose');

const examinationSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, 'Examination name is required'],
      trim: true
    },
    examType: {
      type: String,
      enum: [
        'unit_test',
        'class_test',
        'mid_term',
        'prelim',
        'semester_exam',
        'final_exam',
        'practical_exam',
        'internal_assessment',
        'other'
      ],
      default: 'unit_test'
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
      }
    ],
    sections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section'
      }
    ],
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'ongoing', 'completed', 'published', 'archived'],
      default: 'draft'
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

// Prevent duplicate examination name within the same institution and academic year
examinationSchema.index({ institutionId: 1, academicYearId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Examination', examinationSchema);
