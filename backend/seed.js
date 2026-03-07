// ─── SEED SCRIPT ─────────────────────────────────────────────────────────────
// Run this ONCE to populate your database with test data
// Usage: node seed.js
// Make sure your backend server is NOT running when you run this, OR
// just run: node seed.js from your backend root folder

const mongoose = require("mongoose");

// ── Change this to your MongoDB connection string ──
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ngo-assets";

// ─── SCHEMAS (inline so you don't need to import) ─────────────────────────────
const AssetSchema = new mongoose.Schema({
  name: String,
  category: String,
  serialNumber: String,
  purchaseDate: String,
  purchaseCost: Number,
  condition: String,
  description: String,
  location: String,
  status: { type: String, default: "Available" },
  assignedTo: String,
  assetId: String,
});

const AssignmentSchema = new mongoose.Schema({
  assetId: mongoose.Schema.Types.ObjectId,
  assetName: String,
  assignedTo: String,
  type: String,
  role: String,
  department: String,
  startDate: Date,       // ← stored as Date, not string
  returnDate: Date,
  status: String,
  notes: String,
});

const MaintenanceSchema = new mongoose.Schema({
  assetId: mongoose.Schema.Types.ObjectId,
  assetName: String,
  date: String,
  description: String,
  technician: String,
  cost: Number,
  status: String,
});

const CategorySchema = new mongoose.Schema({
  name: String,
  description: String,
  icon: String,
  assetCount: { type: Number, default: 0 },
});

const Asset = mongoose.model("Asset", AssetSchema);
const Assignment = mongoose.model("Assignment", AssignmentSchema);
const Maintenance = mongoose.model("Maintenance", MaintenanceSchema);
const Category = mongoose.model("Category", CategorySchema);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Clear existing data
  await Asset.deleteMany({});
  await Assignment.deleteMany({});
  await Maintenance.deleteMany({});
  await Category.deleteMany({});
  console.log("🗑️  Cleared old data");

  // ── Categories ──
  const categories = await Category.insertMany([
    { name: "Electronics",  description: "Laptops, phones, projectors", icon: "💻", assetCount: 3 },
    { name: "Furniture",    description: "Chairs, desks, tables",       icon: "🪑", assetCount: 2 },
    { name: "Vehicles",     description: "Cars, bikes, vans",           icon: "🚗", assetCount: 2 },
    { name: "Medical",      description: "First aid, equipment",        icon: "🏥", assetCount: 1 },
    { name: "Office",       description: "Printers, stationery",        icon: "📎", assetCount: 2 },
  ]);
  console.log("✅ Categories seeded");

  // ── Assets ──
  const assets = await Asset.insertMany([
    { name: "Dell Laptop",       category: "Electronics", serialNumber: "DL-001", purchaseDate: "2023-01-15", purchaseCost: 800,  condition: "Good",      location: "Office A", status: "Assigned",    assignedTo: "John Doe",   assetId: "ASSET-001" },
    { name: "HP Projector",      category: "Electronics", serialNumber: "HP-002", purchaseDate: "2023-03-20", purchaseCost: 500,  condition: "Excellent", location: "Office B", status: "Available",   assignedTo: null,         assetId: "ASSET-002" },
    { name: "iPhone 13",         category: "Electronics", serialNumber: "IP-003", purchaseDate: "2022-11-10", purchaseCost: 900,  condition: "Good",      location: "Field",    status: "Assigned",    assignedTo: "Jane Smith", assetId: "ASSET-003" },
    { name: "Office Chair",      category: "Furniture",   serialNumber: "CH-001", purchaseDate: "2022-06-01", purchaseCost: 150,  condition: "Fair",      location: "Office A", status: "Available",   assignedTo: null,         assetId: "ASSET-004" },
    { name: "Standing Desk",     category: "Furniture",   serialNumber: "DS-002", purchaseDate: "2023-07-05", purchaseCost: 400,  condition: "Excellent", location: "Office B", status: "Available",   assignedTo: null,         assetId: "ASSET-005" },
    { name: "Toyota HiAce Van",  category: "Vehicles",    serialNumber: "VH-001", purchaseDate: "2021-09-15", purchaseCost: 25000,condition: "Good",      location: "Garage",   status: "Assigned",    assignedTo: "Field Team", assetId: "ASSET-006" },
    { name: "Honda Motorcycle",  category: "Vehicles",    serialNumber: "MC-002", purchaseDate: "2022-04-20", purchaseCost: 3000, condition: "Fair",      location: "Garage",   status: "Maintenance", assignedTo: null,         assetId: "ASSET-007" },
    { name: "First Aid Kit",     category: "Medical",     serialNumber: "MD-001", purchaseDate: "2023-02-01", purchaseCost: 120,  condition: "Good",      location: "Store",    status: "Available",   assignedTo: null,         assetId: "ASSET-008" },
    { name: "Canon Printer",     category: "Office",      serialNumber: "PR-001", purchaseDate: "2022-08-10", purchaseCost: 350,  condition: "Good",      location: "Office A", status: "Available",   assignedTo: null,         assetId: "ASSET-009" },
    { name: "Xerox Copier",      category: "Office",      serialNumber: "XR-002", purchaseDate: "2021-12-20", purchaseCost: 1200, condition: "Fair",      location: "Office B", status: "Retired",     assignedTo: null,         assetId: "ASSET-010" },
  ]);
  console.log("✅ Assets seeded");

  // ── Assignments (dates stored as Date objects for monthly chart to work) ──
  await Assignment.insertMany([
    { assetId: assets[0]._id, assetName: "Dell Laptop",      assignedTo: "John Doe",    type: "Person", role: "Field Officer",  department: "Operations", startDate: new Date("2025-01-10"), returnDate: new Date("2025-03-10"), status: "Active" },
    { assetId: assets[2]._id, assetName: "iPhone 13",        assignedTo: "Jane Smith",  type: "Person", role: "Coordinator",    department: "Programs",   startDate: new Date("2025-02-01"), returnDate: new Date("2025-04-01"), status: "Active" },
    { assetId: assets[5]._id, assetName: "Toyota HiAce Van", assignedTo: "Field Team",  type: "Event",  eventName: "Outreach",  location: "District 5",   startDate: new Date("2025-02-15"), returnDate: new Date("2025-02-20"), status: "Returned" },
    { assetId: assets[0]._id, assetName: "Dell Laptop",      assignedTo: "Alice Brown", type: "Person", role: "Analyst",        department: "Finance",    startDate: new Date("2025-03-05"), returnDate: new Date("2025-05-05"), status: "Active" },
    { assetId: assets[1]._id, assetName: "HP Projector",     assignedTo: "Conference",  type: "Event",  eventName: "AGM 2025",  location: "HQ",           startDate: new Date("2025-03-20"), returnDate: new Date("2025-03-21"), status: "Returned" },
    { assetId: assets[2]._id, assetName: "iPhone 13",        assignedTo: "Bob Lee",     type: "Person", role: "Driver",         department: "Logistics",  startDate: new Date("2025-04-01"), returnDate: new Date("2025-06-01"), status: "Active" },
    { assetId: assets[5]._id, assetName: "Toyota HiAce Van", assignedTo: "Survey Team", type: "Event",  eventName: "Survey Run",location: "Region A",     startDate: new Date("2025-04-10"), returnDate: new Date("2025-04-15"), status: "Returned" },
    { assetId: assets[8]._id, assetName: "Canon Printer",    assignedTo: "Carol White", type: "Person", role: "Admin",          department: "Admin",      startDate: new Date("2025-05-01"), returnDate: new Date("2025-07-01"), status: "Active" },
    { assetId: assets[0]._id, assetName: "Dell Laptop",      assignedTo: "David Osei",  type: "Person", role: "IT Officer",     department: "IT",         startDate: new Date("2025-06-10"), returnDate: new Date("2025-08-10"), status: "Overdue" },
    { assetId: assets[3]._id, assetName: "Office Chair",     assignedTo: "Eve Adams",   type: "Person", role: "Manager",        department: "HR",         startDate: new Date("2025-06-20"), returnDate: new Date("2025-09-20"), status: "Active" },
  ]);
  console.log("✅ Assignments seeded");

  // ── Maintenance ──
  await Maintenance.insertMany([
    { assetId: assets[6]._id, assetName: "Honda Motorcycle", date: "2025-03-01", description: "Engine overhaul",        technician: "AutoFix Ltd",   cost: 400,  status: "Completed" },
    { assetId: assets[0]._id, assetName: "Dell Laptop",      date: "2025-04-10", description: "Battery replacement",    technician: "TechCare",      cost: 120,  status: "Completed" },
    { assetId: assets[9]._id, assetName: "Xerox Copier",     date: "2025-05-05", description: "Paper jam & cleaning",   technician: "OfficePro",     cost: 80,   status: "Completed" },
    { assetId: assets[6]._id, assetName: "Honda Motorcycle", date: "2025-06-15", description: "Tyre replacement",       technician: "AutoFix Ltd",   cost: 200,  status: "In Progress" },
    { assetId: assets[1]._id, assetName: "HP Projector",     date: "2025-07-01", description: "Bulb replacement",       technician: "TechCare",      cost: 250,  status: "Scheduled" },
  ]);
  console.log("✅ Maintenance seeded");

  console.log("\n🎉 Database seeded successfully! Start your server and check the dashboard.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed error:", err.message);
  process.exit(1);
});