import React, { useState } from 'react';
import Login from './Login.jsx';
import Register from './Register';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('login');

  const showRegister = () => setCurrentView('register');
  const showLogin = () => setCurrentView('login');

  return (
    <div className="app-container">
      {currentView === 'login' && <Login onShowRegister={showRegister} />}
      {currentView === 'register' && <Register onShowLogin={showLogin} />}
    </div>
  );
}

export default App;
