const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    serialNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Available', 'Assigned', 'Maintenance', 'Retired'],
      default: 'Available',
    },
    assignedTo: {
      type: String,
      default: null,
    },
    purchaseDate: {
      type: String,
    },
    purchaseCost: {
      type: Number,
      default: 0,
    },
    condition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor'],
      default: 'Good',
    },
    description: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate assetId before saving
assetSchema.pre('save', async function (next) {
  if (!this.assetId) {
    const count = await mongoose.model('Asset').countDocuments();
    this.assetId = 'AST' + String(count + 1).padStart(3, '0');
  }
  next();
});

module.exports = mongoose.model('Asset', assetSchema);
