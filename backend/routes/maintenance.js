const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const Asset = require('../models/Asset');
const { protect } = require('../middleware/auth');

router.use(protect);

// @route GET /api/maintenance
// @desc  Get all maintenance records
router.get('/', async (req, res) => {
  try {
    const { assetId, status } = req.query;
    const filter = {};
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;

    const records = await Maintenance.find(filter)
      .populate('assetId', 'name assetId')
      .sort({ date: -1 });

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/maintenance/:id
// @desc  Get single maintenance record
router.get('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id).populate('assetId');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/maintenance
// @desc  Log a new maintenance record (also updates asset status to Maintenance)
router.post('/', async (req, res) => {
  try {
    const { assetId, status } = req.body;

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    const record = await Maintenance.create({
      ...req.body,
      assetName: asset.name,
    });

    // Put asset into Maintenance status if record is active
    if (status === 'In Progress' || status === 'Scheduled') {
      await Asset.findByIdAndUpdate(assetId, { status: 'Maintenance' });
    }

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/maintenance/:id
// @desc  Update a maintenance record
router.put('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    // If maintenance is completed, set asset back to Available
    if (req.body.status === 'Completed') {
      await Asset.findByIdAndUpdate(record.assetId, { status: 'Available' });
    }

    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/maintenance/:id
// @desc  Delete a maintenance record
router.delete('/:id', async (req, res) => {
  try {
    const record = await Maintenance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Maintenance record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
