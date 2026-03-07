const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    maintenanceId: {
      type: String,
      unique: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    assetName: String,
    date: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    technician: {
      type: String,
      required: true,
    },
    cost: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed'],
      default: 'Scheduled',
    },
  },
  { timestamps: true }
);

// Auto-generate maintenanceId
maintenanceSchema.pre('save', async function (next) {
  if (!this.maintenanceId) {
    const count = await mongoose.model('Maintenance').countDocuments();
    this.maintenanceId = 'MNT' + String(count + 1).padStart(3, '0');
  }
  next();
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
