const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Asset = require('../models/Asset');
const { protect } = require('../middleware/auth');

router.use(protect);

// @route GET /api/assignments
// @desc  Get all assignments, optionally filter by status
router.get('/', async (req, res) => {
  try {
    const { status, assetId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (assetId) filter.assetId = assetId;

    const assignments = await Assignment.find(filter)
      .populate('assetId', 'name assetId serialNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/assignments/:id
// @desc  Get single assignment
router.get('/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('assetId');
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/assignments
// @desc  Create a new assignment (also updates the asset's status)
router.post('/', async (req, res) => {
  try {
    const { assetId, assignedTo } = req.body;

    // Verify asset exists and is available
    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });
    if (asset.status !== 'Available') {
      return res.status(400).json({ success: false, message: `Asset is currently ${asset.status}` });
    }

    const assignment = await Assignment.create({
      ...req.body,
      assetName: asset.name,
    });

    // Update asset status
    await Asset.findByIdAndUpdate(assetId, { status: 'Assigned', assignedTo });

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/assignments/:id
// @desc  Update an assignment (e.g., mark as Returned)
router.put('/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    // If status is changed to Returned, free up the asset
    if (req.body.status === 'Returned') {
      await Asset.findByIdAndUpdate(assignment.assetId, {
        status: 'Available',
        assignedTo: null,
      });
    }

    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
