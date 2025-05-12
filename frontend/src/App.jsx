
// App.jsx - Main application component
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import StudentProfile from './components/StudentProfile';
import DataUpload from './components/DataUpload';
import Login from './components/Login';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && <Navbar />}
        <main className="main-content">
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? 
                <Navigate to="/dashboard" /> : 
                <Login setIsAuthenticated={setIsAuthenticated} />
            } />
            <Route path="/dashboard" element={
              isAuthenticated ? 
                <Dashboard /> : 
                <Navigate to="/login" />
            } />
            <Route path="/student/:studentId" element={
              isAuthenticated ? 
                <StudentProfile /> : 
                <Navigate to="/login" />
            } />
            <Route path="/upload" element={
              isAuthenticated ? 
                <DataUpload /> : 
                <Navigate to="/login" />
            } />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;