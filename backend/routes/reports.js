const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const Assignment = require("../models/Assignment");
const Maintenance = require("../models/Maintenance");
const { protect } = require("../middleware/auth");

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
router.get("/summary", protect, async (req, res) => {
  try {
    const totalAssets       = await Asset.countDocuments();
    const available         = await Asset.countDocuments({ status: "Available" });
    const assigned          = await Asset.countDocuments({ status: "Assigned" });
    const maintenance       = await Asset.countDocuments({ status: "Maintenance" });
    const retired           = await Asset.countDocuments({ status: "Retired" });
    const totalAssignments  = await Assignment.countDocuments();
    const activeAssignments = await Assignment.countDocuments({ status: "Active" });

    res.json({ success: true, data: { totalAssets, available, assigned, maintenance, retired, totalAssignments, activeAssignments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── BY CATEGORY ──────────────────────────────────────────────────────────────
router.get("/by-category", protect, async (req, res) => {
  try {
    const data = await Asset.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── BY STATUS ────────────────────────────────────────────────────────────────
router.get("/by-status", protect, async (req, res) => {
  try {
    const data = await Asset.aggregate([
      { $group: { _id: "$status", value: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: 1 } },
      { $sort: { value: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MONTHLY ASSIGNMENTS ──────────────────────────────────────────────────────
// FIX: Handles both Date objects AND string dates (e.g. "2025-01-10")
router.get("/monthly-assignments", protect, async (req, res) => {
  try {
    const data = await Assignment.aggregate([
      // Convert startDate to a proper Date if it is stored as a string
      {
        $addFields: {
          startDateParsed: {
            $cond: {
              if: { $eq: [{ $type: "$startDate" }, "date"] },
              then: "$startDate",
              else: { $dateFromString: { dateString: "$startDate", onError: null, onNull: null } },
            },
          },
        },
      },
      // Drop documents where we couldn't parse the date
      { $match: { startDateParsed: { $ne: null } } },
      {
        $group: {
          _id: {
            year:  { $year:  "$startDateParsed" },
            month: { $month: "$startDateParsed" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              {
                $arrayElemAt: [
                  ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                  { $subtract: ["$_id.month", 1] },
                ],
              },
              " ",
              { $toString: "$_id.year" },
            ],
          },
          count: 1,
        },
      },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── TOP ASSIGNED ASSETS ──────────────────────────────────────────────────────
router.get("/top-assigned", protect, async (req, res) => {
  try {
    const data = await Assignment.aggregate([
      { $group: { _id: "$assetName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MAINTENANCE COSTS ────────────────────────────────────────────────────────
router.get("/maintenance-costs", protect, async (req, res) => {
  try {
    const data = await Maintenance.aggregate([
      { $group: { _id: "$assetName", totalCost: { $sum: "$cost" }, count: { $sum: 1 } } },
      { $sort: { totalCost: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: "$_id", totalCost: 1, count: 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;