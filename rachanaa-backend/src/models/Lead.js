// const mongoose = require('mongoose');

// const leadSchema = new mongoose.Schema({
//   // Common fields
//   name: { type: String, required: true, trim: true },
//   mobile: { type: String, required: true, trim: true },
//   service: { type: String, required: true, trim: true },
//   category: {
//     type: String,
//     enum: ['Insurance', 'Loan', 'Investment', 'Career', 'General', 'Motor'],
//     default: 'General'
//   },

//   // Motor-specific fields
//   vehicleNumber: { type: String, trim: true, uppercase: true },
//   vehicleType: { type: String, trim: true }, // 2 Wheeler / 4 Wheeler / Commercial Vehicle

//   // File uploads (motor)
//   rcFrontFile: { type: String }, // filename stored
//   rcBackFile:  { type: String },
//   prevPolicyFile: { type: String },

//   // Status
//   status: {
//     type: String,
//     enum: ['New', 'Contacted', 'In Progress', 'Converted', 'Closed'],
//     default: 'New'
//   },

//   // Notes
//   notes: { type: String, default: '' },

//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });

// leadSchema.pre('save', function(next) {
//   this.updatedAt = new Date();
//   next();
// });

// // Index for fast queries
// leadSchema.index({ category: 1, createdAt: -1 });
// leadSchema.index({ status: 1 });
// leadSchema.index({ mobile: 1 });

// module.exports = mongoose.model('Lead', leadSchema);


const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // Common fields
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  service: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Insurance', 'Loan', 'Investment', 'Career', 'General', 'Motor'],
    default: 'General'
  },

  // Location
  city: { type: String, trim: true },

  // Insurance specific
  insuranceType: { type: String, trim: true },

  // Loan specific
  loanType: { type: String, trim: true },
  loanAmount: { type: String, trim: true },

  // Investment specific
  investmentType: { type: String, trim: true },
  monthlyInvestment: { type: String, trim: true },
  investmentGoals: { type: String, trim: true },

  // Aviation specific
  jobCategory: { type: String, trim: true },
  qualification: { type: String, trim: true },

  // Message/Notes
  message: { type: String, default: '' },
  notes: { type: String, default: '' },

  // Motor-specific fields
  vehicleNumber: { type: String, trim: true, uppercase: true },
  vehicleType: { type: String, trim: true },

  // File uploads (motor)
  rcFrontFile: { type: String },
  rcBackFile:  { type: String },
  prevPolicyFile: { type: String },

  // Status
  status: {
    type: String,
    enum: ['New', 'Contacted', 'In Progress', 'Converted', 'Closed'],
    default: 'New'
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

leadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for fast queries
leadSchema.index({ category: 1, createdAt: -1 });
leadSchema.index({ status: 1 });
leadSchema.index({ mobile: 1 });

module.exports = mongoose.model('Lead', leadSchema);