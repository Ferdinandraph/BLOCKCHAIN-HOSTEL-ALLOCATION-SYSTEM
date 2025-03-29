import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import HostelAllocationABI from '../../HostelAllocationABI.json';

const AdminLogin = ({ setAccount }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const address = process.env.REACT_APP_CONTRACT_ADDRESS;
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      if (username !== process.env.REACT_APP_ADMIN_USERNAME || password !== process.env.REACT_APP_ADMIN_PASSWORD) {
        setError('Invalid username or password');
        return;
      }

      if (!window.ethereum) throw new Error('Please install MetaMask');
      const provider = new ethers.BrowserProvider(window.ethereum, "sepolia");
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      const contract = new ethers.Contract(address, HostelAllocationABI, provider);
      const isAdmin = await contract.admins(walletAddress);
      if (!isAdmin) {
        setError('This wallet is not an admin');
        return;
      }

      setAccount(walletAddress);
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed: ' + err.message);
    }
  };

  return (
    <div className="container my-5 text-center">
      <h2 className="mb-4 fw-bold text-primary">Admin Login</h2>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        className="form-control mb-3"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary" onClick={handleLogin}>Connect MetaMask</button>
      {error && <p className="text-danger mt-3">{error}</p>}
    </div>
  );
};

export default AdminLogin;