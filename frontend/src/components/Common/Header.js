import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ account, setAccount, onLogout }) => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
      <div className="container-fluid">
        {/* Brand/Title */}
        <Link className="navbar-brand fw-bold text-primary" to="/">
          Hostel Allocation System
        </Link>

        {/* Toggler for mobile */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navigation Links */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {!account ? (
              <>
                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/"
                    onClick={onLogout}
                  >
                    Admin Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link"
                    to="/student-login"
                    onClick={onLogout}
                  >
                    Student Login
                  </Link>
                </li>
              </>
            ) : (
              <li className="nav-item d-flex align-items-center">
                <span className="navbar-text me-3">
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={onLogout}
                >
                  Logout
                </button>
              </li>
            )}
          </ul>

          {/* Connection Status (when not logged in) */}
          {!account && (
            <span className="navbar-text ms-3">
              🔌 Not Connected
            </span>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;