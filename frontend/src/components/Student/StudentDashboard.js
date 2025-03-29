import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import HostelAllocationABI from '../../HostelAllocationABI.json';

const StudentDashboard = ({ account }) => {
  const [studentInfo, setStudentInfo] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const address = process.env.REACT_APP_CONTRACT_ADDRESS;
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const contract = new ethers.Contract(address, HostelAllocationABI, provider);
      
      const [hostel, room, pendingHostel, pendingRoom] = await contract.getStudentInfo(account);
      setStudentInfo({
        hostel,
        room: room.toString(),
        pendingHostel,
        pendingRoom: pendingRoom.toString()
      });

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
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (!account) {
      navigate('/student-login');
      return;
    }
    fetchData();
  }, [account, navigate]);

  const fetchRooms = async (hostelName) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const contract = new ethers.Contract(address, HostelAllocationABI, provider);
      const roomIds = await contract.getHostelRoomIds(hostelName);
      const roomDetails = await Promise.all(
        roomIds.map(async (id) => {
          const [roomId, capacity, available, occupancy] = await contract.getRoomInfo(hostelName, id);
          return { id: roomId.toString(), capacity: capacity.toString(), available, occupancy: occupancy.toString() };
        })
      );
      setRooms(roomDetails.filter(room => room.available && room.occupancy < 4));
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const requestAllocation = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.requestRoom(selectedHostel, selectedRoom);
      await tx.wait();
      alert('Room allocation requested, pending admin approval');
      setStudentInfo({ ...studentInfo, pendingHostel: selectedHostel, pendingRoom: selectedRoom });
    } catch (error) {
      console.error('Error requesting allocation:', error);
      alert('Allocation failed: ' + error.message);
    }
  };

  if (!account) return null;

  return (
    <div className="container my-5">
      <h2 className="text-center mb-4 fw-bold text-primary">Student Dashboard</h2>
      {studentInfo ? (
        <div className="card mb-4">
          <div className="card-body">
            <p><strong>Allocated Hostel:</strong> {studentInfo.hostel || 'Not allocated'}</p>
            <p><strong>Allocated Room:</strong> {studentInfo.room || 'Not allocated'}</p>
            <p><strong>Pending Hostel:</strong> {studentInfo.pendingHostel || 'None'}</p>
            <p><strong>Pending Room:</strong> {studentInfo.pendingRoom || 'None'}</p>
          </div>
        </div>
      ) : (
        <p>Loading student information...</p>
      )}
      <h3 className="mb-3 text-secondary">Select Hostel and Room</h3>
      <div className="row">
        <div className="col-md-6 mb-3">
          <select
            className="form-select"
            onChange={(e) => {
              setSelectedHostel(e.target.value);
              fetchRooms(e.target.value);
            }}
          >
            <option value="">Select Hostel</option>
            {hostels.map((hostel) => (
              <option key={hostel} value={hostel}>{hostel}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6 mb-3">
          <select
            className="form-select"
            onChange={(e) => setSelectedRoom(e.target.value)}
            disabled={!selectedHostel}
          >
            <option value="">Select Room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>{`Room ${room.id} (${room.occupancy}/4)`}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        className="btn btn-primary"
        onClick={requestAllocation}
        disabled={!selectedRoom || studentInfo?.pendingHostel}
      >
        Request Allocation
      </button>
    </div>
  );
};

export default StudentDashboard;