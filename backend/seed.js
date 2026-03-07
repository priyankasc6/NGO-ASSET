const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Asset = require('./models/Asset');
const Assignment = require('./models/Assignment');
const Maintenance = require('./models/Maintenance');
const Category = require('./models/Category');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany(),
    Asset.deleteMany(),
    Assignment.deleteMany(),
    Maintenance.deleteMany(),
    Category.deleteMany(),
  ]);
  console.log('Cleared existing data');

  // Seed Users
  await User.create([
    { email: 'admin@ngo.org', password: 'admin123', role: 'Admin' },
    { email: 'staff@ngo.org', password: 'staff123', role: 'Staff' },
  ]);
  console.log('✅ Users seeded');

  // Seed Categories
  const categories = await Category.create([
    { name: 'Electronics', description: 'Computers, tablets, phones', icon: '💻' },
    { name: 'Furniture', description: 'Desks, chairs, shelves', icon: '🪑' },
    { name: 'Vehicles', description: 'Cars, motorcycles', icon: '🚗' },
    { name: 'Medical', description: 'Medical equipment and supplies', icon: '🏥' },
    { name: 'Office Supplies', description: 'Stationery and office tools', icon: '📎' },
  ]);
  console.log('✅ Categories seeded');

  // Seed Assets
  const assets = await Asset.insertMany([
    { assetId: 'AST001', name: 'Dell Latitude Laptop', category: 'Electronics', serialNumber: 'DL-2023-001', status: 'Assigned', assignedTo: 'Alice Johnson', purchaseDate: '2023-01-15', purchaseCost: 1200, condition: 'Good', description: 'Core i5 laptop', location: 'Office A' },
    { assetId: 'AST002', name: 'HP LaserJet Printer', category: 'Electronics', serialNumber: 'HP-2022-045', status: 'Available', purchaseDate: '2022-06-10', purchaseCost: 450, condition: 'Good', description: 'Network printer', location: 'Office B' },
    { assetId: 'AST003', name: 'Office Chair (Ergonomic)', category: 'Furniture', serialNumber: 'FC-2021-012', status: 'Available', purchaseDate: '2021-03-20', purchaseCost: 280, condition: 'Fair', description: 'Adjustable height', location: 'Office A' },
    { assetId: 'AST004', name: 'Toyota Hilux', category: 'Vehicles', serialNumber: 'TH-2020-001', status: 'Maintenance', purchaseDate: '2020-11-05', purchaseCost: 32000, condition: 'Fair', description: 'Field operations vehicle', location: 'Garage' },
    { assetId: 'AST005', name: 'iPad Pro 11-inch', category: 'Electronics', serialNumber: 'IP-2023-003', status: 'Assigned', assignedTo: 'Bob Smith', purchaseDate: '2023-04-12', purchaseCost: 900, condition: 'Excellent', description: 'Data collection tablet', location: 'Field' },
    { assetId: 'AST006', name: 'Blood Pressure Monitor', category: 'Medical', serialNumber: 'BP-2022-007', status: 'Available', purchaseDate: '2022-09-01', purchaseCost: 150, condition: 'Good', description: 'Digital BP monitor', location: 'Health Clinic' },
    { assetId: 'AST007', name: 'Conference Table', category: 'Furniture', serialNumber: 'CT-2019-001', status: 'Available', purchaseDate: '2019-07-15', purchaseCost: 600, condition: 'Good', description: '10-seat conference table', location: 'Meeting Room' },
    { assetId: 'AST008', name: 'Lenovo ThinkPad', category: 'Electronics', serialNumber: 'LT-2022-018', status: 'Retired', purchaseDate: '2018-02-20', purchaseCost: 950, condition: 'Poor', description: 'Old admin laptop', location: 'Storage' },
    { assetId: 'AST009', name: 'Portable Generator', category: 'Electronics', serialNumber: 'PG-2021-004', status: 'Maintenance', purchaseDate: '2021-08-30', purchaseCost: 800, condition: 'Fair', description: 'Backup power generator', location: 'Compound' },
    { assetId: 'AST010', name: 'Wheelchair', category: 'Medical', serialNumber: 'WC-2023-002', status: 'Assigned', assignedTo: 'Community Event', purchaseDate: '2023-02-14', purchaseCost: 350, condition: 'Excellent', description: 'Foldable wheelchair', location: 'Field' },
  ]);
  console.log('✅ Assets seeded');

  // Seed Assignments
  await Assignment.insertMany([
    { assignmentId: 'ASN001', assetId: assets[0]._id, assetName: 'Dell Latitude Laptop', assignedTo: 'Alice Johnson', type: 'Person', role: 'Field Officer', department: 'Operations', startDate: '2024-01-10', returnDate: '2024-06-30', status: 'Active', notes: 'For field data collection' },
    { assignmentId: 'ASN002', assetId: assets[4]._id, assetName: 'iPad Pro 11-inch', assignedTo: 'Bob Smith', type: 'Person', role: 'Data Analyst', department: 'M&E', startDate: '2024-02-01', returnDate: '2024-07-31', status: 'Active', notes: 'Survey work' },
    { assignmentId: 'ASN003', assetId: assets[9]._id, assetName: 'Wheelchair', assignedTo: 'Community Outreach 2024', type: 'Event', eventName: 'Community Outreach 2024', location: 'District 5', eventDate: '2024-03-15', startDate: '2024-03-14', returnDate: '2024-03-16', status: 'Returned' },
    { assignmentId: 'ASN004', assetId: assets[1]._id, assetName: 'HP LaserJet Printer', assignedTo: 'Carol Davis', type: 'Person', role: 'Admin', department: 'Admin', startDate: '2023-09-01', returnDate: '2023-12-31', status: 'Returned' },
    { assignmentId: 'ASN005', assetId: assets[5]._id, assetName: 'Blood Pressure Monitor', assignedTo: 'Health Camp March', type: 'Event', eventName: 'Health Camp March', location: 'Village A', eventDate: '2024-01-20', startDate: '2024-01-19', returnDate: '2024-01-21', status: 'Overdue', notes: 'Still in field' },
  ]);
  console.log('✅ Assignments seeded');

  // Seed Maintenance
  await Maintenance.insertMany([
    { maintenanceId: 'MNT001', assetId: assets[3]._id, assetName: 'Toyota Hilux', date: '2024-03-01', description: 'Engine oil change and tire rotation', technician: 'James Mwangi', cost: 250, status: 'Completed' },
    { maintenanceId: 'MNT002', assetId: assets[8]._id, assetName: 'Portable Generator', date: '2024-03-10', description: 'Fuel pump replacement', technician: 'Tech Support Ltd', cost: 180, status: 'In Progress' },
    { maintenanceId: 'MNT003', assetId: assets[3]._id, assetName: 'Toyota Hilux', date: '2024-04-01', description: 'Scheduled 6-month service', technician: 'James Mwangi', cost: 400, status: 'Scheduled' },
    { maintenanceId: 'MNT004', assetId: assets[7]._id, assetName: 'Lenovo ThinkPad', date: '2023-12-15', description: 'Hard drive failure - data recovered', technician: 'IT Department', cost: 90, status: 'Completed' },
  ]);
  console.log('✅ Maintenance records seeded');

  console.log('\n🎉 Seeding complete!');
  console.log('Login credentials:');
  console.log('  Admin → admin@ngo.org / admin123');
  console.log('  Staff → staff@ngo.org / staff123');
  mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed error:', err);
  mongoose.disconnect();
});
