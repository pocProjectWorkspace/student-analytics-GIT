// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/dashboard">Student Analytics</Link>
      </div>
      
      <ul className="navbar-links">
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>
        <li>
          <Link to="/upload">Upload Data</Link>
        </li>
        <li>
          <a href="#" onClick={() => window.location.reload()}>Logout</a>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;