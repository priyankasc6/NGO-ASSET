const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Assignment = require('../models/Assignment');
const Maintenance = require('../models/Maintenance');
const { protect } = require('../middleware/auth');

router.use(protect);

// @route GET /api/reports/summary
// @desc  Get dashboard summary stats
router.get('/summary', async (req, res) => {
  try {
    const [total, available, assigned, maintenance, retired] = await Promise.all([
      Asset.countDocuments(),
      Asset.countDocuments({ status: 'Available' }),
      Asset.countDocuments({ status: 'Assigned' }),
      Asset.countDocuments({ status: 'Maintenance' }),
      Asset.countDocuments({ status: 'Retired' }),
    ]);

    res.json({
      success: true,
      data: { total, available, assigned, maintenance, retired },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/reports/assets-by-category
// @desc  Count assets grouped by category
router.get('/assets-by-category', async (req, res) => {
  try {
    const data = await Asset.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { name: '$_id', count: 1, _id: 0 } },
      { $sort: { name: 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/reports/assets-by-status
// @desc  Count assets grouped by status
router.get('/assets-by-status', async (req, res) => {
  try {
    const data = await Asset.aggregate([
      { $group: { _id: '$status', value: { $sum: 1 } } },
      { $project: { name: '$_id', value: 1, _id: 0 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/reports/monthly-assignments
// @desc  Count assignments grouped by month (current year)
router.get('/monthly-assignments', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const data = await Assignment.aggregate([
      {
        $match: {
          startDate: { $regex: `^${year}` },
        },
      },
      {
        $group: {
          _id: { $substr: ['$startDate', 5, 2] }, // extract MM
          assignments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: {
            $arrayElemAt: [
              ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              { $toInt: '$_id' },
            ],
          },
          assignments: 1,
          _id: 0,
        },
      },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/reports/top-assigned-assets
// @desc  Get top assets by number of assignments
router.get('/top-assigned-assets', async (req, res) => {
  try {
    const data = await Assignment.aggregate([
      { $group: { _id: '$assetName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { name: '$_id', count: 1, _id: 0 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/reports/maintenance-costs
// @desc  Total maintenance costs per asset
router.get('/maintenance-costs', async (req, res) => {
  try {
    const data = await Maintenance.aggregate([
      { $group: { _id: '$assetName', totalCost: { $sum: '$cost' }, count: { $sum: 1 } } },
      { $sort: { totalCost: -1 } },
      { $project: { name: '$_id', totalCost: 1, count: 1, _id: 0 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
