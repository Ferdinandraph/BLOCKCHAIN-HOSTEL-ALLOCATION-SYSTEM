import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import HostelAllocationABI from '../../HostelAllocationABI.json';

const StudentLogin = ({ setAccount }) => {
  const [regNumber, setRegNumber] = useState('');
  const [error, setError] = useState('');
  const address = process.env.REACT_APP_CONTRACT_ADDRESS;
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      if (!window.ethereum) throw new Error('Please install MetaMask');
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      const contract = new ethers.Contract(address, HostelAllocationABI, provider);
      const storedWallet = await contract.getStudentByRegNumber(regNumber);
      if (storedWallet === ethers.ZeroAddress || storedWallet !== walletAddress) {
        setError('Invalid registration number or wallet mismatch');
        return;
      }

      setAccount(walletAddress);
      navigate('/student');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed: ' + err.message);
    }
  };

  return (
    <div className="container my-5 text-center">
      <h2 className="mb-4 fw-bold text-primary">Student Login</h2>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Registration Number"
        value={regNumber}
        onChange={(e) => setRegNumber(e.target.value)}
      />
      <button className="btn btn-primary" onClick={handleLogin}>Connect MetaMask</button>
      {error && <p className="text-danger mt-3">{error}</p>}
    </div>
  );
};

export default StudentLogin;