import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import HostelAllocationABI from '../../HostelAllocationABI.json';
import AddHostel from './AddHostel';
import AddRoom from './AddRoom';

const AdminDashboard = ({ account }) => {
  const [pendingAllocations, setPendingAllocations] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [newStudent, setNewStudent] = useState({ name: '', regNumber: '', wallet: '' });
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const address = process.env.REACT_APP_CONTRACT_ADDRESS;
  const navigate = useNavigate();

  console.log('Environment variables:', process.env);

  const fetchData = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const contract = new ethers.Contract(address, HostelAllocationABI, provider);

      console.log('Fetching pending allocations...');
      const pending = await contract.getPendingAllocations();
      console.log('Pending allocations:', pending);
      setPendingAllocations(pending);

      const hostelList = [];
      let i = 0;
      while (true) {
        try {
          console.log(`Fetching hostel at index ${i}`);
          const hostelName = await contract.hostelNames(i);
          if (!hostelName) {
            console.log('No more hostels found');
            break;
          }
          console.log(`Hostel name: ${hostelName}`);
          const roomIds = await contract.getHostelRoomIds(hostelName);
          console.log(`Room IDs for ${hostelName}:`, roomIds);
          const roomDetails = await Promise.all(
            roomIds.map(async (id) => {
              console.log(`Fetching room info for ${hostelName}, room ${id}`);
              const [roomId, capacity, available, occupancy, occupants] = await contract.getRoomInfo(hostelName, id);
              return {
                id: roomId.toString(),
                capacity: capacity.toString(),
                available,
                occupancy: occupancy.toString(),
                occupants,
              };
            })
          );
          hostelList.push({ name: hostelName, rooms: roomDetails });
          i++;
        } catch (error) {
          console.log("End of hostelNames at index", i, "Error:", error.message);
          break;
        }
      }
      console.log('Hostel list:', hostelList);
      setHostels(hostelList);
      saveToMongoDB(hostelList);
    } catch (error) {
      console.error('Error fetching data:', error);
      setHostels([]);
    }
  };

  const saveToMongoDB = async (data) => {
    try {
      console.log(`Fetching URL: ${process.env.REACT_APP_BACKEND_URL}/api/save`);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log('Data saved to MongoDB:', result);
    } catch (error) {
      console.error('Error saving to MongoDB:', error);
    }
  };

  useEffect(() => {
    if (!account) {
      navigate('/admin-login');
      return;
    }
    fetchData();
  }, [account, navigate]);

  const approveAllocation = async (index) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.approveAllocation(index);
      await tx.wait();
      alert('Allocation approved');
      setPendingAllocations(pendingAllocations.filter((_, i) => i !== index));
      await fetchData();
    } catch (error) {
      console.error('Error approving allocation:', error);
      alert('Approval failed: ' + error.message);
    }
  };

  const registerStudent = async () => {
    try {
      const { name, regNumber, wallet } = newStudent;
      if (!name || !regNumber || !wallet) {
        alert('All fields are required');
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.registerStudent(name, regNumber, wallet);
      await tx.wait();
      alert('Student registered successfully');
      setNewStudent({ name: '', regNumber: '', wallet: '' });
    } catch (error) {
      console.error('Error registering student:', error);
      alert('Failed to register student: ' + error.message);
    }
  };

  const addAdmin = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.addAdmin(newAdminAddress);
      await tx.wait();
      alert('Admin added successfully');
      setNewAdminAddress('');
    } catch (error) {
      console.error('Error adding admin:', error);
      alert('Failed to add admin: ' + error.message);
    }
  };

  const deleteHostel = async (name) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.deleteHostel(name);
      await tx.wait();
      alert(`Hostel ${name} deleted`);
      fetchData();
    } catch (error) {
      console.error('Error deleting hostel:', error);
      alert('Failed to delete hostel: ' + error.message);
    }
  };

  const deleteRoom = async (hostelName, roomId) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.deleteRoom(hostelName, parseInt(roomId));
      await tx.wait();
      alert(`Room ${roomId} in ${hostelName} deleted`);
      fetchData();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room: ' + error.message);
    }
  };

  const deleteStudent = async (wallet) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.deleteStudent(wallet);
      await tx.wait();
      alert(`Student ${wallet} deleted`);
      fetchData();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student: ' + error.message);
    }
  };

  const deleteAdmin = async (wallet) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, HostelAllocationABI, signer);
      const tx = await contract.deleteAdmin(wallet);
      await tx.wait();
      alert(`Admin ${wallet} deleted`);
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Failed to delete admin: ' + error.message);
    }
  };

  if (!account) return null;

  return (
    <div className="container my-5">
      <h2 className="text-center mb-4 fw-bold text-primary">Admin Dashboard</h2>
      <div className="row mb-4">
        <div className="col-md-6"><AddHostel account={account} refreshData={fetchData} /></div>
        <div className="col-md-6"><AddRoom account={account} refreshData={fetchData} /></div>
      </div>
      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h4>Register Student</h4>
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Student Name"
            value={newStudent.name}
            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
          />
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Registration Number"
            value={newStudent.regNumber}
            onChange={(e) => setNewStudent({ ...newStudent, regNumber: e.target.value })}
          />
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Student Wallet Address (0x...)"
            value={newStudent.wallet}
            onChange={(e) => setNewStudent({ ...newStudent, wallet: e.target.value })}
          />
          <button className="btn btn-primary" onClick={registerStudent}>Register Student</button>
        </div>
      </div>
      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h4>Add New Admin</h4>
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Admin Wallet Address (0x...)"
            value={newAdminAddress}
            onChange={(e) => setNewAdminAddress(e.target.value)}
          />
          <button className="btn btn-primary" onClick={addAdmin}>Add Admin</button>
        </div>
      </div>
      <h3 className="mt-5 mb-3 text-secondary">Hostels and Rooms</h3>
      {hostels.length > 0 ? (
        <div className="accordion" id="hostelAccordion">
          {hostels.map((hostel, idx) => (
            <div className="accordion-item" key={hostel.name}>
              <h2 className="accordion-header" id={`heading${idx}`}>
                <button
                  className="accordion-button"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#collapse${idx}`}
                  aria-expanded={idx === 0 ? "true" : "false"}
                  aria-controls={`collapse${idx}`}
                >
                  <strong>{hostel.name}</strong>
                  <button
                    className="btn btn-danger btn-sm ms-3"
                    onClick={(e) => { e.stopPropagation(); deleteHostel(hostel.name); }}
                  >
                    Delete Hostel
                  </button>
                </button>
              </h2>
              <div
                id={`collapse${idx}`}
                className={`accordion-collapse collapse ${idx === 0 ? 'show' : ''}`}
                aria-labelledby={`heading${idx}`}
                data-bs-parent="#hostelAccordion"
              >
                <div className="accordion-body">
                  {hostel.rooms.length > 0 ? (
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Room ID</th>
                          <th>Occupancy</th>
                          <th>Status</th>
                          <th>Occupants</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hostel.rooms.map((room) => (
                          <tr key={room.id}>
                            <td>{room.id}</td>
                            <td>{room.occupancy}/{room.capacity}</td>
                            <td>
                              <span className={`badge ${room.available ? 'bg-success' : 'bg-danger'}`}>
                                {room.available ? 'Available' : 'Full'}
                              </span>
                            </td>
                            <td>{room.occupants.filter(o => o !== ethers.ZeroAddress).join(', ') || 'None'}</td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => deleteRoom(hostel.name, room.id)}
                              >
                                Delete
                              </button>
                              {room.occupants.filter(o => o !== ethers.ZeroAddress).map((occupant) => (
                                <button
                                  key={occupant}
                                  className="btn btn-warning btn-sm ms-2"
                                  onClick={() => deleteStudent(occupant)}
                                >
                                  Remove {occupant.slice(0, 6)}...
                                </button>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-muted">No rooms added yet</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="alert alert-info text-center" role="alert">
          No hostels added yet
        </div>
      )}
      <h3 className="mt-5 mb-3 text-secondary">Pending Allocations</h3>
      {pendingAllocations.length > 0 ? (
        <div className="card shadow-sm">
          <div className="card-body">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Wallet Address</th>
                  <th>Hostel</th>
                  <th>Room</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingAllocations.map((alloc, index) => (
                  <tr key={index}>
                    <td>{alloc.wallet}</td>
                    <td>{alloc.hostelName}</td>
                    <td>{alloc.roomId.toString()}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => approveAllocation(index)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger ms-2"
                        onClick={() => deleteStudent(alloc.wallet)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning text-center" role="alert">
          No pending allocations
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;