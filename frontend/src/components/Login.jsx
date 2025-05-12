// frontend/src/components/Login.jsx
import React, { useState } from 'react';

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // For demo purposes, just check if fields are not empty
    if (username && password) {
      // In a real app, this would make an API call to verify credentials
      setIsAuthenticated(true);
    } else {
      setError('Please enter both username and password');
    }
  };

  return (
    <div className="login-container">
      <h1>Student Analytics Login</h1>
      
      <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <button type="submit" className="login-button">Login</button>
        
        <p className="demo-credentials">
          <strong>Demo Note:</strong> Enter any username/password to log in
        </p>
      </form>
    </div>
  );
};

export default Login;