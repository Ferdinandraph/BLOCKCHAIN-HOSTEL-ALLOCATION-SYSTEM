const express = require('express');
const router = express.Router();
const Hostel = require('../models/Hostel');
const { ethers } = require('ethers');
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const contractAddress = process.env.CONTRACT_ADDRESS;

if (!contractAddress) {
  throw new Error('CONTRACT_ADDRESS is not defined in .env');
}

if (!process.env.ADMIN_PRIVATE_KEY) {
  throw new Error('ADMIN_PRIVATE_KEY is not defined in .env');
}

const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
const HostelAllocationABI = require('../HostelAllocationABI.json');
const contract = new ethers.Contract(contractAddress, HostelAllocationABI, wallet);

router.post('/save', async (req, res) => {
  try {
    const hostelList = req.body;
    console.log('Saving to MongoDB:', hostelList);
    if (!Array.isArray(hostelList)) {
      return res.status(400).json({ error: 'Expected an array of hostels' });
    }
    for (const hostel of hostelList) {
      await Hostel.updateOne(
        { name: hostel.name },
        { $set: hostel },
        { upsert: true }
      );
    }
    res.status(200).json({ message: 'Data saved to MongoDB' });
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/restore', async (req, res) => {
  try {
    const hostels = await Hostel.find();
    if (!hostels.length) {
      return res.status(200).json({ message: 'No data to restore' });
    }
    console.log('Hostels from MongoDB:', JSON.stringify(hostels, null, 2));

    const signerAddress = wallet.address;
    console.log(`Signer: ${signerAddress}`);

    const isAdmin = await contract.admins(signerAddress);
    console.log(`Signer ${signerAddress} is admin: ${isAdmin}`);
    if (!isAdmin) {
      throw new Error('Signer is not an admin');
    }

    const existingHostels = [];
    let i = 0;
    while (true) {
      try {
        const hostelName = await contract.hostelNames(i);
        if (!hostelName) break;
        existingHostels.push(hostelName);
        i++;
      } catch (error) {
        console.log("End of hostelNames at index", i, "Error:", error.message);
        break;
      }
    }
    console.log("Existing hostels in contract:", existingHostels);

    const uniqueHostels = Array.from(new Set(hostels.map(h => h.name))).map(name => 
      hostels.find(h => h.name === name)
    );
    console.log("Unique hostels to restore:", uniqueHostels.map(h => h.name));

    const allOccupants = new Set();
    for (const hostel of uniqueHostels) {
      for (const room of hostel.rooms || []) {
        const occupants = (room.occupants || []).filter(o => o && o !== ethers.ZeroAddress);
        occupants.forEach(occupant => allOccupants.add(occupant));
      }
    }
    for (const occupant of allOccupants) {
      console.log(`Checking student ${occupant}`);
      const student = await contract.students(occupant);
      console.log(`Student ${occupant} registered: ${student.registered}`);
      if (!student.registered) {
        console.log(`Registering student ${occupant}`);
        const txRegister = await contract.registerStudent(occupant, { gasLimit: 300000 });
        console.log(`Registration tx hash: ${txRegister.hash}`);
        await txRegister.wait();
        console.log(`Student ${occupant} registered`);
      }
    }

    for (const hostel of uniqueHostels) {
      if (!existingHostels.includes(hostel.name)) {
        console.log(`Attempting to restore hostel: ${hostel.name}`);
        try {
          const tx = await contract.addHostel(hostel.name, { gasLimit: 300000 });
          console.log(`Hostel tx hash: ${tx.hash}`);
          await tx.wait();
          existingHostels.push(hostel.name);
          console.log(`Hostel ${hostel.name} added`);
        } catch (error) {
          console.log(`Hostel ${hostel.name} already exists or failed:`, error.message);
        }
      } else {
        console.log(`Hostel ${hostel.name} already exists in contract, skipping addition`);
      }

      let existingRoomIds = await contract.getHostelRoomIds(hostel.name);
      console.log(`Existing room IDs for ${hostel.name}:`, existingRoomIds.map(id => id.toString()));

      for (const room of hostel.rooms || []) {
        const roomId = parseInt(room.id);
        if (!existingRoomIds.map(id => id.toString()).includes(roomId.toString())) {
          console.log(`Restoring room ${roomId} to ${hostel.name}`);
          try {
            const tx = await contract.addRoom(hostel.name, roomId, { gasLimit: 300000 });
            console.log(`Room tx hash: ${tx.hash}`);
            await tx.wait();
            console.log(`Room ${roomId} added to ${hostel.name}`);
            existingRoomIds = await contract.getHostelRoomIds(hostel.name);
            console.log(`Updated room IDs for ${hostel.name}:`, existingRoomIds.map(id => id.toString()));
          } catch (error) {
            console.log(`Failed to add room ${roomId} to ${hostel.name}:`, error.message);
          }
        } else {
          console.log(`Room ${roomId} already exists in ${hostel.name}, skipping addition`);
        }

        const occupants = (room.occupants || []).filter(o => o && o !== ethers.ZeroAddress);
        const occupancy = parseInt(room.occupancy) || occupants.length;
        console.log(`Restoring state for room ${roomId} in ${hostel.name}:`, {
          occupants,
          currentOccupancy: occupancy,
          isAvailable: room.available
        });
        const tx2 = await contract.restoreRoomOccupants(
          hostel.name,
          roomId,
          occupants,
          occupancy,
          room.available ?? true,
          { gasLimit: 300000 }
        );
        console.log(`Room occupants tx hash: ${tx2.hash}`);
        await tx2.wait();

        for (const occupant of occupants) {
          console.log(`Restoring allocation for ${occupant} to ${hostel.name}, room ${roomId}`);
          const tx3 = await contract.restoreStudentAllocation(occupant, hostel.name, roomId, { gasLimit: 300000 });
          console.log(`Allocation tx hash: ${tx3.hash}`);
          await tx3.wait();
          console.log(`Allocation restored for ${occupant}`);
        }
      }
    }
    res.status(200).json({ message: 'Data restored to contract' });
  } catch (error) {
    console.error('Error restoring to contract:', error);
    if (error.data) console.error('Error data:', error.data);
    res.status(500).json({ error: error.reason || error.message || 'Unknown error' });
  }
});

router.get('/reset-mongodb', async (req, res) => {
  try {
    await Hostel.deleteMany({});
    console.log('MongoDB hostel data cleared');
    res.status(200).json({ message: 'MongoDB hostel data cleared' });
  } catch (error) {
    console.error('Error clearing MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Endpoints
router.delete('/hostel/:name', async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`Deleting hostel: ${name}`);

    const signerAddress = wallet.address;
    const isAdmin = await contract.admins(signerAddress);
    if (!isAdmin) throw new Error('Signer is not an admin');

    const tx = await contract.deleteHostel(name, { gasLimit: 300000 });
    console.log(`Hostel delete tx hash: ${tx.hash}`);
    await tx.wait();

    await Hostel.deleteOne({ name });
    console.log(`Hostel ${name} deleted from MongoDB`);

    res.status(200).json({ message: `Hostel ${name} deleted` });
  } catch (error) {
    console.error('Error deleting hostel:', error);
    res.status(500).json({ error: error.reason || error.message });
  }
});

router.delete('/room/:hostelName/:roomId', async (req, res) => {
  try {
    const { hostelName, roomId } = req.params;
    console.log(`Deleting room ${roomId} from hostel: ${hostelName}`);

    const signerAddress = wallet.address;
    const isAdmin = await contract.admins(signerAddress);
    if (!isAdmin) throw new Error('Signer is not an admin');

    const tx = await contract.deleteRoom(hostelName, parseInt(roomId), { gasLimit: 300000 });
    console.log(`Room delete tx hash: ${tx.hash}`);
    await tx.wait();

    await Hostel.updateOne(
      { name: hostelName },
      { $pull: { rooms: { id: roomId.toString() } } }
    );
    console.log(`Room ${roomId} deleted from MongoDB`);

    res.status(200).json({ message: `Room ${roomId} in ${hostelName} deleted` });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: error.reason || error.message });
  }
});

router.delete('/student/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    console.log(`Deleting student: ${wallet}`);

    const signerAddress = wallet.address;
    const isAdmin = await contract.admins(signerAddress);
    if (!isAdmin) throw new Error('Signer is not an admin');

    const tx = await contract.deleteStudent(wallet, { gasLimit: 300000 });
    console.log(`Student delete tx hash: ${tx.hash}`);
    await tx.wait();

    // Update MongoDB by removing student from all rooms
    await Hostel.updateMany(
      { 'rooms.occupants': wallet },
      { $pull: { 'rooms.$[].occupants': wallet } }
    );
    console.log(`Student ${wallet} removed from MongoDB rooms`);

    res.status(200).json({ message: `Student ${wallet} deleted` });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: error.reason || error.message });
  }
});

router.delete('/admin/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    console.log(`Deleting admin: ${wallet}`);

    const signerAddress = wallet.address;
    const isAdmin = await contract.admins(signerAddress);
    if (!isAdmin) throw new Error('Signer is not an admin');

    const tx = await contract.deleteAdmin(wallet, { gasLimit: 300000 });
    console.log(`Admin delete tx hash: ${tx.hash}`);
    await tx.wait();

    res.status(200).json({ message: `Admin ${wallet} deleted` });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: error.reason || error.message });
  }
});

module.exports = router;