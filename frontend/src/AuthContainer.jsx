import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";

const AuthContainer = () => {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="login-card">
      <div className="login-left">
        <img src="/imagenes/DGMM-Gobierno.png" alt="Logo DGMM" />
      </div>

      <div className="login-right">
        {!showRegister ? (
          <Login onShowRegister={() => setShowRegister(true)} />
        ) : (
          <Register onShowLogin={() => setShowRegister(false)} />
        )}
      </div>
    </div>
  );
};

export default AuthContainer;
