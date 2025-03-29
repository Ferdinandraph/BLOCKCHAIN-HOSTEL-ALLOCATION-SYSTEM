import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Common/Header';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import StudentLogin from './components/Student/StudentLogin';
import StudentDashboard from './components/Student/StudentDashboard';
import { ethers } from 'ethers';
import './styles.css';

const DisconnectHandler = ({ setAccount, isLoggingIn }) => {
  const location = useLocation();

  useEffect(() => {
    if ((location.pathname === '/' || location.pathname === '/student-login') && !isLoggingIn) {
      setAccount(null);
      localStorage.removeItem('account');
    }
  }, [location.pathname, setAccount, isLoggingIn]);

  return null;
};

function App() {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (!window.ethereum) {
        setIsLoading(false);
        return;
      }
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          const storedAccount = localStorage.getItem('account');
          setAccount(storedAccount || accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkWalletConnection();
  }, []);

  const setAccountAndPersist = (newAccount) => {
    console.log("setAccountAndPersist called with:", newAccount);
    setAccount(newAccount);
    if (newAccount) {
      localStorage.setItem('account', newAccount);
    } else {
      localStorage.removeItem('account');
    }
  };

  const handleLogout = () => {
    setAccountAndPersist(null);
    localStorage.removeItem(`regNumber_${account}`);
    navigate('/');
    console.log("Logged out, redirected to /student-login");
  };

  if (isLoading) {
    return <div className="container my-5 text-center">Loading...</div>;
  }

  return (
    <div className="App">
      <DisconnectHandler setAccount={setAccountAndPersist} isLoggingIn={isLoggingIn} />
      <Header account={account} setAccount={setAccountAndPersist} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<AdminLogin setAccount={setAccountAndPersist} onLogout={handleLogout} />} />
        <Route path="/admin" element={<AdminDashboard account={account} setAccount={setAccountAndPersist} />} />
        <Route path="/student-login" element={<StudentLogin setAccount={setAccountAndPersist} onLogout={handleLogout} setIsLoggingIn={setIsLoggingIn} />} />
        <Route path="/student" element={<StudentDashboard account={account} />} />
      </Routes>
    </div>
  );
}

export default App;