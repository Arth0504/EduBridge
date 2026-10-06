const mongoose = require('mongoose');

const gradeTierSchema = new mongoose.Schema(
  {
    grade: { type: String, required: true, trim: true },
    minPercentage: { type: Number, required: true, min: 0, max: 100 },
    maxPercentage: { type: Number, required: true, min: 0, max: 100 },
    description: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const gradingRuleSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution ID is required']
    },
    name: {
      type: String,
      required: [true, 'Grading scheme name is required'],
      trim: true,
      default: 'Standard Grading Scheme'
    },
    rules: {
      type: [gradeTierSchema],
      default: [
        { grade: 'A+', minPercentage: 90, maxPercentage: 100, description: 'Outstanding' },
        { grade: 'A', minPercentage: 80, maxPercentage: 89.99, description: 'Excellent' },
        { grade: 'B+', minPercentage: 70, maxPercentage: 79.99, description: 'Very Good' },
        { grade: 'B', minPercentage: 60, maxPercentage: 69.99, description: 'Good' },
        { grade: 'C', minPercentage: 50, maxPercentage: 59.99, description: 'Satisfactory' },
        { grade: 'D', minPercentage: 40, maxPercentage: 49.99, description: 'Pass' },
        { grade: 'F', minPercentage: 0, maxPercentage: 39.99, description: 'Fail' }
      ]
    },
    isDefault: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

gradingRuleSchema.index({ institutionId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('GradingRule', gradingRuleSchema);
