const mongoose = require('mongoose');

// Article Analysis Schema
const ArticleAnalysisSchema = new mongoose.Schema({
  // Article metadata
  title: { type: String, required: true },
  source: { type: String, required: true },
  date: { type: Date, required: true },
  excerpt: { type: String, required: true },
  link: { type: String },
  
  // Analysis results
  characters: {
    hero_class: { type: String, default: 'NONE' },
    villain_class: { type: String, default: 'NONE' },
    victim_class: { type: String, default: 'NONE' },
    focus: { type: String }
  },
  
  action: {
    action: { type: String }
  },
  
  story: {
    story: { type: String }
  },
  
  // Metadata
  analyzed_at: { type: Date, default: Date.now },
  analysis_type: { type: String, enum: ['automated', 'manual'], default: 'automated' },
  week_number: { type: Number }, // ISO week number for grouping
  year: { type: Number }
}, {
  timestamps: true
});

// Indexes for efficient queries
ArticleAnalysisSchema.index({ date: -1 });
ArticleAnalysisSchema.index({ source: 1, date: -1 });
ArticleAnalysisSchema.index({ week_number: 1, year: 1 });
ArticleAnalysisSchema.index({ analyzed_at: -1 });

// Helper method to get ISO week number
ArticleAnalysisSchema.methods.setWeekNumber = function() {
  const date = new Date(this.date);
  const onejan = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  this.week_number = weekNumber;
  this.year = date.getFullYear();
};

// Pre-save hook to set week number
ArticleAnalysisSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('date')) {
    this.setWeekNumber();
  }
  next();
});

module.exports = mongoose.model('ArticleAnalysis', ArticleAnalysisSchema);
