const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  id: String,
  capacity: String,
  available: Boolean,
  occupancy: String,
  occupants: [String],
});

const HostelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  rooms: [RoomSchema],
});

module.exports = mongoose.model('Hostel', HostelSchema);