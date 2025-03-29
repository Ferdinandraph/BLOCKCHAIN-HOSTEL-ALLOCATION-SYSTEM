import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import HostelAllocationABI from '../../HostelAllocationABI.json';

const AddRoom = ({ account, refreshData }) => {
  const [hostelName, setHostelName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [hostels, setHostels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const address = process.env.REACT_APP_CONTRACT_ADDRESS;

  const fetchHostels = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const contract = new ethers.Contract(address, HostelAllocationABI, provider);
      const hostelList = [];
      let i = 0;
      while (true) {
        try {
          const name = await contract.hostelNames(i);
          if (!name) break;
          hostelList.push(name);
          i++;
        } catch (error) {
          console.log("End of hostelNames at index", i);
          break;
        }
      }
      setHostels(hostelList);
    } catch (error) {
      console.error('Error fetching hostels:', error);
      setHostels([]);
    }
  };

  useEffect(() => {
    if (account) fetchHostels();
  }, [account]);

  const addRoom = async () => {
    if (!hostelName) {
      alert('Please select a hostel');
      return;
    }
    if (!roomId || isNaN(roomId) || parseInt(roomId) <= 0) {
      alert('Please enter a valid room ID');
      return;
    }
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        alert('Please switch to the Sepolia network in MetaMask');
        return;
      }
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.addRoom(hostelName, parseInt(roomId));
      await tx.wait();
      alert('Room added successfully');
      setHostelName('');
      setRoomId('');
      if (refreshData) refreshData();
    } catch (error) {
      console.error('Error adding room:', error);
      alert('Failed to add room: ' + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-body">
      <h3 className="card-title text-success mb-3">Add New Room</h3>
      <form>
        <div className="mb-3">
          <label htmlFor="hostelSelect" className="form-label fw-bold">
            Hostel Name
          </label>
          <select
            id="hostelSelect"
            className="form-select"
            value={hostelName}
            onChange={(e) => setHostelName(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select a hostel</option>
            {hostels.map((hostel) => (
              <option key={hostel} value={hostel}>
                {hostel}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="roomId" className="form-label fw-bold">
            Room ID
          </label>
          <input
            type="number"
            className="form-control"
            id="roomId"
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary w-100"
          onClick={addRoom}
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Room'}
        </button>
      </form>
    </div>
  );
};

export default AddRoom;