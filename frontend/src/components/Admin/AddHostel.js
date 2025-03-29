import React, { useState } from 'react';
import { ethers } from 'ethers';
import HostelAllocationABI from '../../HostelAllocationABI.json';

const AddHostel = ({ account, refreshData }) => {
  const [hostelName, setHostelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const address = process.env.REACT_APP_CONTRACT_ADDRESS;

  const addHostel = async () => {
    if (!hostelName) {
      alert('Please enter a hostel name');
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

      const tx = await contract.addHostel(hostelName);
      await tx.wait();
      alert('Hostel added successfully!');
      setHostelName('');
      if (refreshData) refreshData();
    } catch (error) {
      console.error('Error adding hostel:', error);
      alert('Failed to add hostel: ' + (error.reason || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-body">
      <h3 className="card-title text-success mb-3">Add New Hostel</h3>
      <form>
        <div className="mb-3">
          <label htmlFor="hostelName" className="form-label fw-bold">
            Hostel Name
          </label>
          <input
            type="text"
            className="form-control"
            id="hostelName"
            placeholder="Enter hostel name"
            value={hostelName}
            onChange={(e) => setHostelName(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary w-100"
          onClick={addHostel}
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Hostel'}
        </button>
      </form>
    </div>
  );
};

export default AddHostel;