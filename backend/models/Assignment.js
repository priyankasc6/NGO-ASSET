const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: String,
      unique: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    assetName: String,
    assignedTo: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Person', 'Event'],
      required: true,
    },
    // Person fields
    role: String,
    department: String,
    // Event fields
    eventName: String,
    location: String,
    eventDate:{
      type:Date
    } ,
    // Common fields
    startDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Returned', 'Overdue'],
      default: 'Active',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Auto-generate assignmentId
assignmentSchema.pre('save', async function (next) {
  if (!this.assignmentId) {
    const count = await mongoose.model('Assignment').countDocuments();
    this.assignmentId = 'ASN' + String(count + 1).padStart(3, '0');
  }
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
